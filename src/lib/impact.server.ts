// Impact.com partner API sync. Server-only: reads secrets and uses the admin database client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeCashback, effectiveShare, slugify } from "./cashback";
import { parseSettings, type Settings } from "./settings";
import { fetchAllRows } from "./fetch-all";
import { extractCode, extractDiscount, isExpired, isPlaceholderAd, offerTitle } from "./offers";
import { decryptCredentials, encryptCredentials } from "./credential-encryption.server";

type Admin = SupabaseClient<Database>;
type Json = Record<string, unknown>;

const BASE = "https://api.impact.com";

// Follow only same-origin redirects; never forward private credentials elsewhere.
async function requestImpact(path: string, auth: string, accept = "application/json"): Promise<Response> {
  const resource = new URL(path, BASE).pathname.split("/")[3] ?? "request";
  for (let attempt = 0; attempt < 2; attempt++) {
    let url = new URL(path, BASE);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      for (let hop = 0; hop <= 3; hop++) {
        if (url.origin !== BASE || url.username || url.password) throw new Error("Invalid Impact API destination.");
        let response: Response;
        try {
          response = await fetch(url.href, {
            headers: { Authorization: auth, Accept: accept },
            redirect: "manual", signal: controller.signal,
          });
        } catch {
          if (attempt === 0) break;
          throw new Error(controller.signal.aborted
            ? `Impact ${resource} request timed out after retrying. Your credentials are still saved; please retry the sync.`
            : `A network connection to Impact could not be established after retrying (${resource}). Your credentials are still saved.`);
        }
        if (![301, 302, 303, 307, 308].includes(response.status)) return response;
        const location = response.headers.get("Location");
        await response.body?.cancel();
        if (!location || hop === 3) throw new Error("Impact returned an unexpected redirect. Your saved connection was not changed.");
        try { url = new URL(location, url); } catch {
          throw new Error("Impact returned an unexpected redirect. Your saved connection was not changed.");
        }
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Impact could not be reached. Your saved connection was not changed.");
}

export async function impactConfigured() {
  return !!(await readCredentials());
}

async function readCredentials() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("integration_credentials").select("encrypted_credentials").eq("provider", "impact").maybeSingle();
  if (error) throw new Error("Impact connection status is unavailable. Please try again.");
  if (data) return decryptCredentials(data.encrypted_credentials, process.env["IMPACT_CREDENTIAL_ENCRYPTION_KEY"] ?? "");
  const sid = process.env["IMPACT_ACCOUNT_SID"];
  const token = process.env["IMPACT_AUTH_TOKEN"];
  return sid && token ? { sid, token } : null;
}

async function creds() {
  const value = await readCredentials();
  const { sid, token } = value ?? {};
  if (!sid || !token) throw new Error("Impact API credentials are not set yet.");
  return { sid, auth: "Basic " + btoa(`${sid}:${token}`) };
}

export async function saveImpactCredentials(value: { sid: string; token: string }, userId: string) {
  // Validate against Impact before replacing a working connection. Never surface its response body.
  const response = await requestImpact(`/Mediapartners/${encodeURIComponent(value.sid)}/Campaigns?PageSize=1`, "Basic " + btoa(`${value.sid}:${value.token}`));
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? "Impact rejected these credentials. Check your Account SID, Auth Token and API permissions."
    : "Impact could not verify these credentials. Please try again; your saved connection was not changed.");
  const encrypted = await encryptCredentials(value, process.env["IMPACT_CREDENTIAL_ENCRYPTION_KEY"] ?? "");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("integration_credentials").upsert({ provider: "impact", encrypted_credentials: encrypted, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw new Error("Impact credentials could not be saved. Please try again.");
}

export async function impactLogo(campaignId: string) {
  const { sid } = await creds();
  return impactRaw(`/Mediapartners/${sid}/Campaigns/${campaignId}/Logo`, "*/*");
}

export async function impactRaw(path: string, accept = "application/json"): Promise<Response> {
  const { auth } = await creds();
  return requestImpact(path, auth, accept);
}

async function impactJson(path: string): Promise<Json> {
  const res = await impactRaw(path);
  if (!res.ok) {
    throw new Error(`Impact API request failed (${res.status}). Check your connection and API permissions in Settings.`);
  }
  return (await res.json()) as Json;
}

export async function impactList(firstPath: string, key: string, maxPages = 400): Promise<Json[]> {
  const out: Json[] = [];
  let path: string | null = firstPath;
  for (let i = 0; path && i < maxPages; i++) {
    // Smaller pages avoid expensive bulk responses. Preserve filters on every next-page URL.
    const page = new URL(path, BASE);
    page.searchParams.set("PageSize", "100");
    const json = await impactJson(page.href);
    const items = json[key];
    if (Array.isArray(items)) out.push(...(items as Json[]));
    const next = json["@nextpageuri"];
    path = typeof next === "string" && next.length > 0 ? next : null;
  }
  // Never treat a truncated feed as complete: doing so could hide valid stores/offers.
  if (path) throw new Error(`Impact ${key} import exceeded the page limit. No incomplete feed was saved.`);
  return out;
}

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Best rate found anywhere in a contract's payout terms. */
export function extractPayout(contract: unknown): { type: "percent" | "flat"; rate: number } | null {
  let pct = 0;
  let flat = 0;
  // Impact contracts: Terms.EventPayouts[].DefaultPayoutRate (percent), .DefaultPayout (flat),
  // .PayoutGroups[].PayoutRate (percent tiers). Public terms use PayoutPercentage / PayoutAmount.
  const PCT_KEYS = new Set(["defaultpayoutrate", "payoutrate", "payoutpercentage", "payoutpercent"]);
  const FLAT_KEYS = new Set(["defaultpayout", "payoutamount"]);
  const SKIP_KEYS = new Set(["performancebonus", "limits", "payoutrestrictions", "payoutadjustments", "locking", "payoutscheduling"]);
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Json)) {
        const key = k.toLowerCase();
        if (SKIP_KEYS.has(key)) continue;
        if (PCT_KEYS.has(key)) pct = Math.max(pct, num(val));
        else if (FLAT_KEYS.has(key)) flat = Math.max(flat, num(val));
        else if (val && typeof val === "object") walk(val);
      }
    }
  };
  walk(contract);
  if (pct > 0) return { type: "percent", rate: Math.round(pct * 100) / 100 };
  if (flat > 0) return { type: "flat", rate: Math.round(flat * 100) / 100 };
  return null;
}

export async function loadSettings(admin: Admin): Promise<Settings> {
  const { data } = await admin.from("app_settings").select("key, value");
  return parseSettings(data);
}

export async function syncStores(admin: Admin, settings: Settings) {
  const { sid } = await creds();
  const campaigns = await impactList(`/Mediapartners/${sid}/Campaigns?PageSize=100`, "Campaigns");

  const rates = new Map<string, { type: "percent" | "flat"; rate: number }>();
  let contractsError: string | null = null;
  try {
    const contracts = await impactList(`/Mediapartners/${sid}/Contracts?PageSize=100`, "Contracts");
    for (const c of contracts) {
      const id = str(c["CampaignId"]);
      const p = extractPayout(c);
      if (id && p) rates.set(id, p);
    }
  } catch (e) {
    contractsError = e instanceof Error ? e.message : String(e);
  }

  const existing = await fetchAllRows((from, to) =>
    admin
      .from("stores")
      .select("id, impact_campaign_id, name, slug, logo_url, commission_type, commission_rate, impact_status")
      .range(from, to),
  );
  const byCampaign = new Map(existing.filter((s) => s.impact_campaign_id).map((s) => [s.impact_campaign_id!, s]));
  const slugs = new Set(existing.map((s) => s.slug));
  const now = new Date().toISOString();

  const active = campaigns.filter((c) => {
    const status = str(c["ContractStatus"]).toLowerCase();
    return !status || status === "active";
  });
  const activeIds = new Set(active.map((c) => str(c["CampaignId"])));

  const inserts: Database["public"]["Tables"]["stores"]["Insert"][] = [];
  const updates: Database["public"]["Tables"]["stores"]["Insert"][] = [];

  for (const c of active) {
    const campaignId = str(c["CampaignId"]);
    if (!campaignId) continue;
    const rate = rates.get(campaignId);
    const ex = byCampaign.get(campaignId);
    const trackingLink = str(c["TrackingLink"]) || null;
    const logo = `/api/public/store-logo/${campaignId}`;
    if (ex) {
      updates.push({
        impact_campaign_id: campaignId,
        name: ex.name,
        slug: ex.slug,
        impact_advertiser_id: str(c["AdvertiserId"]) || null,
        tracking_link: trackingLink,
        website_url: str(c["CampaignUrl"]) || null,
        logo_url: ex.logo_url ?? logo,
        commission_type: rate?.type ?? ex.commission_type,
        commission_rate: rate?.rate ?? ex.commission_rate,
        impact_status: "Active",
        last_synced_at: now,
      });
    } else {
      const name = str(c["CampaignName"]) || str(c["AdvertiserName"]) || `Store ${campaignId}`;
      let slug = slugify(name);
      if (slugs.has(slug)) slug = `${slug}-${campaignId}`;
      slugs.add(slug);
      inserts.push({
        impact_campaign_id: campaignId,
        impact_advertiser_id: str(c["AdvertiserId"]) || null,
        name,
        slug,
        description: str(c["CampaignDescription"]) || null,
        website_url: str(c["CampaignUrl"]) || null,
        tracking_link: trackingLink,
        logo_url: logo,
        commission_type: rate?.type ?? "percent",
        commission_rate: rate?.rate ?? null,
        is_active: settings.auto_publish_new_stores,
        source: "impact",
        impact_status: "Active",
        last_synced_at: now,
      });
    }
  }

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await admin.from("stores").insert(inserts.slice(i, i + 500));
    if (error) throw new Error(`Saving new stores failed: ${error.message}`);
  }
  for (let i = 0; i < updates.length; i += 500) {
    const { error } = await admin.from("stores").upsert(updates.slice(i, i + 500), { onConflict: "impact_campaign_id" });
    if (error) throw new Error(`Updating stores failed: ${error.message}`);
  }

  // Programs that are no longer approved get hidden.
  const expired = existing
    .filter((s) => s.impact_campaign_id && !activeIds.has(s.impact_campaign_id) && s.impact_status !== "Expired")
    .map((s) => s.id);
  for (let i = 0; i < expired.length; i += 200) {
    await admin.from("stores").update({ impact_status: "Expired", is_active: false }).in("id", expired.slice(i, i + 200));
  }

  return {
    campaigns_found: campaigns.length,
    approved: active.length,
    new_stores: inserts.length,
    updated_stores: updates.length,
    hidden_stores: expired.length,
    rates_found: rates.size,
    ...(contractsError ? { rates_warning: contractsError } : {}),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapState(state: string): "pending" | "approved" | "declined" {
  const s = state.toUpperCase();
  if (s === "APPROVED" || s === "LOCKED" || s === "PAID") return "approved";
  if (s === "REVERSED" || s === "DECLINED" || s === "REJECTED") return "declined";
  return "pending";
}

function impactDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function syncActions(admin: Admin, settings: Settings) {
  const { sid } = await creds();
  const days = Math.min(Math.max(Math.round(settings.actions_lookback_days) || 30, 1), 180);
  const end = new Date();
  const actions: Json[] = [];
  // Impact limits the date range per request, so walk back in 30-day windows.
  for (let offset = 0; offset < days; offset += 30) {
    const winEnd = new Date(end.getTime() - offset * 86400000);
    const winStart = new Date(end.getTime() - Math.min(offset + 30, days) * 86400000);
    const path = `/Mediapartners/${sid}/Actions?ActionDateStart=${encodeURIComponent(impactDate(winStart))}&ActionDateEnd=${encodeURIComponent(impactDate(winEnd))}&PageSize=100`;
    actions.push(...(await impactList(path, "Actions")));
  }

  const clickIds = [...new Set(actions.map((a) => str(a["SubId1"]).trim()).filter((s) => UUID_RE.test(s)))];
  const clickMap = new Map<string, { user_id: string; store_id: string | null }>();
  for (let i = 0; i < clickIds.length; i += 200) {
    const { data } = await admin.from("clicks").select("id, user_id, store_id").in("id", clickIds.slice(i, i + 200));
    for (const c of data ?? []) clickMap.set(c.id, { user_id: c.user_id, store_id: c.store_id });
  }

  const stores = await fetchAllRows((from, to) =>
    admin.from("stores").select("id, name, impact_campaign_id, cashback_share").range(from, to),
  );
  const storeByCampaign = new Map(stores.filter((s) => s.impact_campaign_id).map((s) => [s.impact_campaign_id!, s]));
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const actionIds = actions.map((a) => str(a["Id"])).filter(Boolean);
  const locked = new Set<string>();
  for (let i = 0; i < actionIds.length; i += 200) {
    const { data } = await admin
      .from("transactions")
      .select("impact_action_id")
      .eq("locked_by_admin", true)
      .in("impact_action_id", actionIds.slice(i, i + 200));
    for (const t of data ?? []) if (t.impact_action_id) locked.add(t.impact_action_id);
  }

  let matched = 0;
  let unmatched = 0;
  const rows: Database["public"]["Tables"]["transactions"]["Insert"][] = [];
  for (const a of actions) {
    const id = str(a["Id"]);
    if (!id || locked.has(id)) continue;
    const subId = str(a["SubId1"]).trim();
    const click = UUID_RE.test(subId) ? clickMap.get(subId) : undefined;
    const campaignId = str(a["CampaignId"]);
    const store = (click?.store_id && storeById.get(click.store_id)) || storeByCampaign.get(campaignId) || null;
    const payout = num(a["Payout"]);
    const cashback = click ? computeCashback(payout, effectiveShare(store, settings.default_cashback_percent)) : 0;
    if (click) matched++;
    else unmatched++;
    rows.push({
      impact_action_id: id,
      impact_campaign_id: campaignId || null,
      user_id: click?.user_id ?? null,
      click_id: click ? subId : null,
      store_id: store?.id ?? null,
      store_name: store?.name ?? (str(a["CampaignName"]) || null),
      order_amount: num(a["Amount"]),
      commission_amount: payout,
      cashback_amount: cashback,
      currency: str(a["Currency"]) || "USD",
      status: mapState(str(a["State"])),
      event_date: str(a["EventDate"]) || new Date().toISOString(),
      source: "impact",
    });
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("transactions").upsert(rows.slice(i, i + 500), { onConflict: "impact_action_id" });
    if (error) throw new Error(`Saving sales failed: ${error.message}`);
  }

  return { sales_found: actions.length, saved: rows.length, matched_to_members: matched, unmatched, skipped_locked: locked.size, days };
}

type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

export async function syncOffers(admin: Admin, settings: Settings) {
  const { sid } = await creds();
  const ads = await impactList(`/Mediapartners/${sid}/Ads?Type=COUPON&PageSize=100`, "Ads");
  let promoCodes: Json[] = [];
  let promoWarning: string | null = null;
  try {
    promoCodes = await impactList(`/Mediapartners/${sid}/PromoCodes?PageSize=100`, "PromoCodes");
  } catch (e) {
    promoWarning = e instanceof Error ? e.message : String(e);
  }

  const stores = await fetchAllRows((from, to) =>
    admin.from("stores").select("id, impact_campaign_id, tracking_link").range(from, to),
  );
  const storeByCampaign = new Map(stores.filter((s) => s.impact_campaign_id).map((s) => [s.impact_campaign_id!, s]));

  const existing = await fetchAllRows((from, to) =>
    admin.from("offers").select("id, impact_ad_id, locked_by_admin, impact_status").not("impact_ad_id", "is", null).range(from, to),
  );
  const byAdId = new Map(existing.map((o) => [o.impact_ad_id!, o]));
  const now = new Date();
  const nowIso = now.toISOString();

  const inserts: OfferInsert[] = [];
  const updates: OfferInsert[] = [];
  const seen = new Set<string>();
  let noStore = 0;
  let expiredInFeed = 0;

  const push = (row: OfferInsert & { impact_ad_id: string }) => {
    seen.add(row.impact_ad_id);
    const ex = byAdId.get(row.impact_ad_id);
    if (ex?.locked_by_admin) return;
    if (ex) updates.push(row);
    else inserts.push({ ...row, is_active: settings.auto_publish_new_offers, source: "impact" });
  };

  for (const ad of ads) {
    const adId = str(ad["Id"]);
    if (!adId || isPlaceholderAd(ad)) continue;
    const store = storeByCampaign.get(str(ad["CampaignId"]));
    if (!store) {
      noStore++;
      continue;
    }
    const endsAt = str(ad["DealEndDate"]) || str(ad["EndDate"]) || null;
    if (isExpired(str(ad["DealState"]), endsAt, now)) {
      expiredInFeed++;
      continue; // left out of `seen`, so an existing copy gets hidden below
    }
    const code = extractCode(ad);
    const { title, description } = offerTitle(ad, code);
    push({
      impact_ad_id: adId,
      impact_campaign_id: str(ad["CampaignId"]) || null,
      store_id: store.id,
      title,
      description,
      code,
      kind: code ? "coupon" : "deal",
      ...extractDiscount(ad),
      deal_type: str(ad["DealType"]) || null,
      tracking_link: str(ad["TrackingLink"]) || null,
      landing_page_url: str(ad["LandingPageUrl"]) || null,
      starts_at: str(ad["DealStartDate"]) || str(ad["StartDate"]) || null,
      ends_at: endsAt,
      impact_status: "Active",
      last_synced_at: nowIso,
    });
  }

  // Personal promo codes Impact created for this partner account.
  for (const p of promoCodes) {
    const id = str(p["Id"]);
    const code = str(p["Code"]);
    const program = (p["Program"] ?? {}) as Json;
    const store = storeByCampaign.get(str(program["Id"]));
    if (!id || !code) continue;
    if (!store) {
      noStore++;
      continue;
    }
    const endsAt = str(p["EndDate"]) || null;
    if (str(p["State"]).toUpperCase() !== "ACTIVE" || isExpired("", endsAt, now)) {
      expiredInFeed++;
      continue;
    }
    push({
      impact_ad_id: `promo-${id}`,
      impact_campaign_id: str(program["Id"]) || null,
      store_id: store.id,
      title: "Exclusive member code",
      description: "A special code made just for our members.",
      code,
      kind: "coupon",
      discount_type: null,
      discount_percent: null,
      discount_amount: null,
      discount_currency: null,
      deal_type: null,
      tracking_link: store.tracking_link,
      landing_page_url: null,
      starts_at: str(p["StartDate"]) || null,
      ends_at: endsAt,
      impact_status: "Active",
      last_synced_at: nowIso,
    });
  }

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await admin.from("offers").insert(inserts.slice(i, i + 500));
    if (error) throw new Error(`Saving new offers failed: ${error.message}`);
  }
  for (let i = 0; i < updates.length; i += 500) {
    const { error } = await admin.from("offers").upsert(updates.slice(i, i + 500), { onConflict: "impact_ad_id" });
    if (error) throw new Error(`Updating offers failed: ${error.message}`);
  }

  // Offers that expired or were removed in Impact get hidden (unless you edited them yourself).
  const gone = existing
    .filter((o) => !seen.has(o.impact_ad_id!) && !o.locked_by_admin && o.impact_status !== "Expired")
    .map((o) => o.id);
  for (let i = 0; i < gone.length; i += 200) {
    await admin.from("offers").update({ impact_status: "Expired", is_active: false }).in("id", gone.slice(i, i + 200));
  }

  return {
    offers_found: ads.length + promoCodes.length,
    new_offers: inserts.length,
    updated_offers: updates.length,
    hidden_offers: gone.length,
    expired_skipped: expiredInFeed,
    no_store: noStore,
    ...(promoWarning ? { promo_warning: promoWarning } : {}),
  };
}

export type SyncKind = "all" | "stores" | "actions" | "offers";

export async function runImpactSync(admin: Admin, kind: SyncKind, trigger: "manual" | "cron") {
  const settings = await loadSettings(admin);
  if (trigger === "cron" && !settings.auto_sync_enabled) {
    return { skipped: true, reason: "Automatic sync is turned off" };
  }
  const { data: log } = await admin.from("sync_logs").insert({ kind, trigger }).select("id").single();
  const stats: Record<string, unknown> = {};
  try {
    if (kind === "all" || kind === "stores") stats["stores"] = await syncStores(admin, settings);
    if (kind === "all" || kind === "offers") stats["offers"] = await syncOffers(admin, settings);
    if (kind === "all" || kind === "actions") stats["sales"] = await syncActions(admin, settings);
    if (log) {
      await admin
        .from("sync_logs")
        .update({ status: "success", stats: stats as never, finished_at: new Date().toISOString(), message: "Completed" })
        .eq("id", log.id);
    }
    return { skipped: false, stats };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (log) {
      await admin
        .from("sync_logs")
        .update({ status: "error", stats: stats as never, finished_at: new Date().toISOString(), message })
        .eq("id", log.id);
    }
    throw new Error(message);
  }
}

// Core money rules for the cashback site. Kept pure so they can be tested.

export type RateStore = {
  commission_type: string;
  commission_rate: number | null;
  cashback_share: number | null;
  display_rate_override: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(Number((n * 100).toFixed(6))) / 100;
}

/** Percent of the store's commission that goes to the shopper. Store override wins over the site default. */
export function effectiveShare(
  store: { cashback_share: number | null } | null | undefined,
  defaultPercent: number,
): number {
  const v = store?.cashback_share ?? defaultPercent;
  return clamp(Number(v) || 0, 0, 100);
}

/** Shopper cashback for a commission, rounded DOWN to the cent so the site never overpays. */
export function computeCashback(commission: number, sharePercent: number): number {
  if (!Number.isFinite(commission) || commission <= 0) return 0;
  const share = clamp(sharePercent, 0, 100);
  return Math.floor(Number((commission * share).toFixed(6))) / 100;
}

/** Rate shown to shoppers (percent or flat amount), or null when unknown. */
export function displayRate(store: RateStore, defaultPercent: number): number | null {
  if (store.display_rate_override != null) return round2(Number(store.display_rate_override));
  if (store.commission_rate == null) return null;
  return round2((Number(store.commission_rate) * effectiveShare(store, defaultPercent)) / 100);
}

export function formatMoney(amount: number | string | null | undefined, currency = "USD") {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/** e.g. "4%" or "$2.50"; null when the store has no known rate. */
export function formatRate(store: RateStore, defaultPercent: number, currency = "USD"): string | null {
  const rate = displayRate(store, defaultPercent);
  if (rate == null || rate <= 0) return null;
  if (store.commission_type === "flat") return formatMoney(rate, currency);
  return `${Number.isInteger(rate) ? rate : rate.toFixed(rate * 10 === Math.round(rate * 10) ? 1 : 2)}%`;
}

/** Adds the click id as Impact's subId1 so the sale can be matched back to the shopper. */
export function buildTrackingUrl(trackingLink: string, clickId: string): string {
  try {
    const url = new URL(trackingLink);
    url.searchParams.set("subId1", clickId);
    return url.toString();
  } catch {
    const sep = trackingLink.includes("?") ? "&" : "?";
    return `${trackingLink}${sep}subId1=${encodeURIComponent(clickId)}`;
  }
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "store"
  );
}

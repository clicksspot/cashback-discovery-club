import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { createPublicClient } from "./supabase-public";
import { parseSettings } from "./settings";
import { fetchAllRows } from "./fetch-all";
import type { Database } from "@/integrations/supabase/types";

export const STORE_COLUMNS =
  "id, name, slug, logo_url, website_url, description, terms, category_id, commission_type, commission_rate, cashback_share, display_rate_override, rate_prefix, is_featured, sort_order, tracking_link, previous_rate, impact_details";

export type PublicStore = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  terms: string | null;
  category_id: string | null;
  commission_type: string;
  commission_rate: number | null;
  cashback_share: number | null;
  display_rate_override: number | null;
  rate_prefix: string;
  is_featured: boolean;
  sort_order: number;
  tracking_link: string | null;
  previous_rate: number | null;
  impact_details?: Database["public"]["Tables"]["stores"]["Row"]["impact_details"];
};

export type PublicCategory = { id: string; name: string; slug: string; icon: string | null; sort_order: number };

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const { data } = await sb.from("app_settings").select("key, value");
  return parseSettings(data);
});

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const { data, error } = await sb
    .from("categories")
    .select("id, name, slug, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicCategory[];
});

export const listStores = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const rows = await fetchAllRows((from, to) =>
    sb
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order")
      .order("name")
      .range(from, to),
  );
  return rows as unknown as PublicStore[];
});

export const getStoreBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const sb = createPublicClient();
    const { data: store, error } = await sb
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (store as unknown as PublicStore | null) ?? null;
  });

export const settingsQuery = queryOptions({
  queryKey: ["public", "settings"],
  queryFn: () => getPublicSettings(),
  staleTime: 60_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["public", "categories"],
  queryFn: () => listCategories(),
  staleTime: 60_000,
});

export const storesQuery = queryOptions({
  queryKey: ["public", "stores"],
  queryFn: () => listStores(),
  staleTime: 60_000,
});

export const storeQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public", "store", slug],
    queryFn: () => getStoreBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

// ---------- Deals & coupons ----------

const OFFER_COLUMNS =
  "id, title, description, code, kind, discount_type, discount_percent, discount_amount, discount_currency, deal_type, ends_at, is_featured, is_exclusive, sort_order, store_id, stores!inner(name, slug, logo_url, category_id, commission_type, commission_rate, cashback_share, display_rate_override, rate_prefix)";

export type PublicOffer = {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  kind: string;
  discount_type: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  discount_currency: string | null;
  deal_type: string | null;
  ends_at: string | null;
  is_featured: boolean;
  is_exclusive: boolean;
  sort_order: number;
  store_id: string;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    category_id: string | null;
    commission_type: string;
    commission_rate: number | null;
    cashback_share: number | null;
    display_rate_override: number | null;
    rate_prefix: string;
  };
};

function liveOffers(sb: ReturnType<typeof createPublicClient>) {
  return sb
    .from("offers")
    .select(OFFER_COLUMNS)
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);
}

export const listOffers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const rows = await fetchAllRows((from, to) =>
    liveOffers(sb)
      .order("is_featured", { ascending: false })
      .order("is_exclusive", { ascending: false })
      .order("sort_order")
      .order("created_at", { ascending: false })
      .range(from, to),
  );
  return rows as unknown as PublicOffer[];
});

export const listTopOffers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const { data, error } = await liveOffers(sb)
    .order("is_featured", { ascending: false })
    .order("is_exclusive", { ascending: false })
    .order("discount_percent", { ascending: false, nullsFirst: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicOffer[];
});

export const listStoreOffers = createServerFn({ method: "GET" })
  .inputValidator((input: { storeId: string }) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sb = createPublicClient();
    const { data: rows, error } = await liveOffers(sb)
      .eq("store_id", data.storeId)
      .order("is_featured", { ascending: false })
      .order("is_exclusive", { ascending: false })
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as PublicOffer[];
  });

export const getOfferLink = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sb = createPublicClient();
    const { data: row, error } = await sb
      .from("offers")
      .select("id, title, code, tracking_link, store_id")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const offersQuery = queryOptions({
  queryKey: ["public", "offers"],
  queryFn: () => listOffers(),
  staleTime: 60_000,
});

export const topOffersQuery = queryOptions({
  queryKey: ["public", "offers", "top"],
  queryFn: () => listTopOffers(),
  staleTime: 60_000,
});

export const storeOffersQuery = (storeId: string) =>
  queryOptions({
    queryKey: ["public", "offers", "store", storeId],
    queryFn: () => listStoreOffers({ data: { storeId } }),
    staleTime: 60_000,
  });

export const offerLinkQuery = (id: string) =>
  queryOptions({
    queryKey: ["public", "offer-link", id],
    queryFn: () => getOfferLink({ data: { id } }),
    staleTime: 60_000,
  });

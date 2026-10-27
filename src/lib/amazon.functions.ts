import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createPublicClient } from "./supabase-public";
import { amazonAffiliateUrl } from "./amazon";

export const listAmazonOffers = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createPublicClient();
  const { data, error } = await sb.from("amazon_offers")
    .select("id, title, description, affiliate_url, image_url")
    .eq("is_active", true).order("sort_order").order("created_at", { ascending: false });
  if (error) throw new Error("Amazon offers could not be loaded. Please try again.");
  return (data ?? []).filter((offer) => amazonAffiliateUrl(offer.affiliate_url));
});

export const amazonOffersQuery = queryOptions({ queryKey: ["public", "amazon-offers"], queryFn: () => listAmazonOffers() });
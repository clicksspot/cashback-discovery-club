type AmazonStore = { name: string; slug: string; website_url?: string | null; tracking_link?: string | null };

/** Keep the exact SiteStripe URL; never append Impact tracking or a member identifier. */
export function amazonAffiliateUrl(value: string): string | null {
  const link = value.trim();
  try {
    const url = new URL(link);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "amzn.to" && url.pathname.length > 1) return link;
    if ((url.hostname === "amazon.com" || url.hostname === "www.amazon.com") && url.searchParams.get("tag")?.trim()) return link;
  } catch {
    return null;
  }
  return null;
}

/** Recognize Amazon USA without mistaking unrelated brands or lookalike domains for Amazon. */
export function isAmazonUSA(store: AmazonStore): boolean {
  if (/^amazon(?:[\s.-]+(?:usa|us|united states|com))?$/i.test(store.name.trim())) return true;
  if (/^amazon(?:-(?:usa|us|united-states|com))?$/i.test(store.slug)) return true;
  return [store.website_url, store.tracking_link].some((link) => {
    if (!link) return false;
    try {
      const host = new URL(link).hostname.toLowerCase();
      return host === "amazon.com" || host.endsWith(".amazon.com") || host === "amzn.to";
    } catch {
      return false;
    }
  });
}
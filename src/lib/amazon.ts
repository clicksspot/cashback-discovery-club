type AmazonStore = { name: string; slug: string; website_url?: string | null; tracking_link?: string | null };

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
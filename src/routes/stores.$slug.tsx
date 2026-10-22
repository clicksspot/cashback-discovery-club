import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { StoreLogo } from "@/components/site/StoreLogo";
import { Button } from "@/components/ui/button";
import { settingsQuery, storeOffersQuery, storeQuery } from "@/lib/public.functions";
import { OfferCard } from "@/components/site/OfferCard";
import { formatRate } from "@/lib/cashback";

export const Route = createFileRoute("/stores/$slug")({
  loader: async ({ context, params }) => {
    const [settings, store] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(storeQuery(params.slug)),
    ]);
    if (!store) throw notFound();
    await context.queryClient.ensureQueryData(storeOffersQuery(store.id));
    const rate = formatRate(store, settings.default_cashback_percent, settings.currency);
    return { siteName: settings.site_name, storeName: store.name, rate };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Store unavailable" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.storeName} cashback${loaderData.rate ? ` — up to ${loaderData.rate}` : ""} | ${loaderData.siteName}`;
    const description = `Earn cash back every time you shop at ${loaderData.storeName} through ${loaderData.siteName}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <SiteShell>
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-extrabold">Store not found</h1>
        <p className="mt-2 text-muted-foreground">This store isn't available right now.</p>
        <Button asChild className="mt-6"><Link to="/stores" search={{}}>Browse all stores</Link></Button>
      </div>
    </SiteShell>
  ),
  component: StorePage,
});

function StorePage() {
  const { slug } = Route.useParams();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: store } = useSuspenseQuery(storeQuery(slug));
  const { data: offers } = useSuspenseQuery(storeOffersQuery(store?.id ?? ""));
  if (!store) return null;
  const rate = formatRate(store, settings.default_cashback_percent, settings.currency);
  const showOffers = settings.show_deals && offers.length > 0;

  return (
    <SiteShell>
      <section className="bg-hero text-forest-foreground">
        <div className="container-page flex flex-col gap-8 py-12 md:flex-row md:items-center">
          <StoreLogo name={store.name} src={store.logo_url} className="h-28 w-28 shrink-0 md:h-36 md:w-36" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-lime">Cashback at</p>
            <h1 className="text-4xl font-extrabold md:text-5xl">{store.name}</h1>
            <p className="mt-3 font-display text-3xl font-extrabold text-lime">
              {rate ? `${store.rate_prefix ? store.rate_prefix + " " : ""}${rate} cash back` : "Cash back available"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild variant="hero" size="lg" disabled={!store.tracking_link}>
              <Link to="/go/$slug" params={{ slug: store.slug }}>
                Shop now & earn <ArrowRight />
              </Link>
            </Button>
            <p className="text-center text-xs text-forest-foreground/60">Sign in first so we can track your cashback</p>
          </div>
        </div>
      </section>

      <div className="container-page mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {showOffers && (
            <div>
              <h2 className="text-xl font-bold">
                {store.name} coupons & deals <span className="text-base font-medium text-muted-foreground">({offers.length})</span>
              </h2>
              <div className="mt-3 space-y-3">
                {offers.map((o) => <OfferCard key={o.id} offer={o} settings={settings} showStore={false} />)}
              </div>
            </div>
          )}
          {store.description && (
            <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
              <h2 className="text-xl font-bold">About {store.name}</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{store.description}</p>
              {store.website_url && (
                <p className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" /> {store.website_url.replace(/^https?:\/\//, "")}
                </p>
              )}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
            <h2 className="text-xl font-bold">Cashback terms</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {(store.terms
                ? store.terms.split("\n").filter(Boolean)
                : [
                    "Cashback is calculated on the order total after discounts, excluding tax and shipping.",
                    "Make sure you click “Shop now” here right before you buy, in the same browser.",
                    "Avoid using other coupon or cashback sites for the same order.",
                    "Returned or cancelled orders don't earn cashback.",
                  ]
              ).map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-bold">How tracking works</h3>
            <div className="mt-4 space-y-4 text-sm">
              <p className="flex gap-3"><Clock className="h-5 w-5 shrink-0 text-primary" /> Purchases usually show as pending within 1–3 days.</p>
              <p className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /> The store confirms the order after its return window, then your cashback becomes available.</p>
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BadgeDollarSign, MousePointerClick, Search, ShoppingCart, Wallet } from "lucide-react";
import heroImg from "@/assets/hero-cashback.jpg";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site/SiteShell";
import { StoreCard } from "@/components/site/StoreCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { categoriesQuery, settingsQuery, storesQuery, topOffersQuery } from "@/lib/public.functions";
import { OfferCard } from "@/components/site/OfferCard";
import { AmazonDeals } from "@/components/site/AmazonDeals";
import { amazonOffersQuery } from "@/lib/amazon.functions";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [settings] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(storesQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(topOffersQuery),
      context.queryClient.ensureQueryData(amazonOffersQuery),
    ]);
    return { siteName: settings.site_name, tagline: settings.tagline };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `${name} — Cash back at hundreds of top stores`;
    const description = loaderData?.tagline ?? "Earn real cash back when you shop online.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: stores } = useSuspenseQuery(storesQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: topOffers } = useSuspenseQuery(topOffersQuery);
  const { data: amazonOffers } = useSuspenseQuery(amazonOffersQuery);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const featured = stores.filter((s) => s.is_featured).slice(0, 12);
  const showcase = featured.length >= 4 ? featured : stores.slice(0, 12);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="bg-hero text-forest-foreground">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-foreground/10 px-3 py-1 text-xs font-semibold text-lime">
              <BadgeDollarSign className="h-4 w-4" /> {stores.length.toLocaleString()} stores paying cash back
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">{settings.hero_title}</h1>
            <p className="mt-5 max-w-lg text-lg text-forest-foreground/75">{settings.hero_subtitle}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/stores", search: { q: q.trim() || undefined } });
              }}
              className="mt-8 flex max-w-lg items-center gap-2 rounded-2xl bg-card p-2 shadow-lift"
            >
              <Search className="ml-2 h-5 w-5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Which store are you shopping at?"
                className="h-11 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" size="lg" className="h-11">Find cashback</Button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>Join free <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline-light" size="lg">
                <Link to="/how-it-works">How it works</Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-lime/20 blur-3xl" />
            <img src={heroImg} alt="Shopping bags and cash coins" width={1200} height={1008} className="relative rounded-[2rem] shadow-lift" />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container-page mt-12">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/stores"
                search={{ cat: c.slug }}
                className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-card transition hover:border-primary hover:text-primary"
              >
                <CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured stores */}
      <section className="container-page mt-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold">Top cashback stores</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked brands with the best rates right now.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/stores" search={{}}>See all stores <ArrowRight /></Link>
          </Button>
        </div>
        {showcase.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Stores are being imported — check back very soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map((s) => (
              <StoreCard key={s.id} store={s} settings={settings} />
            ))}
          </div>
        )}
      </section>

      {/* Top deals */}
      {settings.show_deals && topOffers.length > 0 && (
        <section className="container-page mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold">Today's top deals</h2>
              <p className="mt-1 text-muted-foreground">Save with a code — and still earn cash back.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/deals" search={{}}>All deals <ArrowRight /></Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {topOffers.map((o) => <OfferCard key={o.id} offer={o} settings={settings} />)}
          </div>
        </section>
      )}

      {/* How it works */}
      <AmazonDeals offers={amazonOffers.slice(0, 6)} />
      <section className="container-page mt-20">
        <h2 className="text-center text-3xl font-extrabold">Cash back in three steps</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: MousePointerClick, title: "Pick a store", text: "Find the store you want and tap “Shop now” while signed in." },
            { icon: ShoppingCart, title: "Shop as normal", text: "Buy what you want. The store tells us about your order automatically." },
            { icon: Wallet, title: "Get paid", text: `Once confirmed, withdraw to ${[settings.payout_paypal && "PayPal", settings.payout_bank && "bank", settings.payout_jazzcash && "JazzCash", settings.payout_easypaisa && "Easypaisa"].filter(Boolean).join(", ")}.` },
          ].map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-border bg-card p-7 shadow-card">
              <span className="absolute right-6 top-5 font-display text-5xl font-extrabold text-secondary">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-lime text-lime-foreground">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-20">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-lime-gradient p-10 text-lime-foreground md:flex-row md:p-14">
          <div>
            <h2 className="text-3xl font-extrabold md:text-4xl">Stop leaving money on the table.</h2>
            <p className="mt-2 text-lime-foreground/80">Free to join. Minimum payout just ${settings.min_withdrawal}.</p>
          </div>
          <Button asChild variant="forest" size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>Create free account <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}

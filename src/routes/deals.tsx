import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Tag, Scissors, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { OfferCard } from "@/components/site/OfferCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { Button } from "@/components/ui/button";
import { categoriesQuery, offersQuery, settingsQuery } from "@/lib/public.functions";

type DealsSearch = { q?: string | undefined; type?: "codes" | "deals" | undefined; cat?: string | undefined };

export const Route = createFileRoute("/deals")({
  validateSearch: (s: Record<string, unknown>): DealsSearch => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    type: s["type"] === "codes" || s["type"] === "deals" ? s["type"] : undefined,
    cat: typeof s["cat"] === "string" && s["cat"] ? s["cat"] : undefined,
  }),
  loader: async ({ context }) => {
    const [settings] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(offersQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]);
    return { siteName: settings.site_name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `Coupon codes & deals | ${name}`;
    const description = `Today's working promo codes and deals from top stores — plus cash back on every order with ${name}.`;
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
  component: DealsPage,
});

const PAGE = 30;

function DealsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/deals" });
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: offers } = useSuspenseQuery(offersQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const [limit, setLimit] = useState(PAGE);
  const [q, setQ] = useState(search.q ?? "");

  const activeCat = categories.find((c) => c.slug === search.cat);
  const codeCount = offers.filter((o) => o.code).length;

  const filtered = useMemo(() => {
    const term = (search.q ?? "").toLowerCase();
    return offers.filter((o) => {
      if (search.type === "codes" && !o.code) return false;
      if (search.type === "deals" && o.code) return false;
      if (activeCat && o.stores.category_id !== activeCat.id) return false;
      if (term && !`${o.title} ${o.description ?? ""} ${o.stores.name}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [offers, search.q, search.type, activeCat]);

  const setSearch = (patch: Partial<DealsSearch>) => {
    setLimit(PAGE);
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  const tabs = [
    { id: undefined, label: `All offers`, count: offers.length, icon: Sparkles },
    { id: "codes" as const, label: "Coupon codes", count: codeCount, icon: Tag },
    { id: "deals" as const, label: "Deals", count: offers.length - codeCount, icon: Scissors },
  ];

  return (
    <SiteShell>
      <section className="bg-hero text-forest-foreground">
        <div className="container-page py-12">
          <h1 className="text-4xl font-extrabold md:text-5xl">Coupon codes & deals</h1>
          <p className="mt-3 max-w-2xl text-forest-foreground/75">
            Save with a code, then earn cash back on top. {offers.length.toLocaleString()} offers from your favourite stores.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch({ q: q.trim() || undefined });
            }}
            className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-card p-2 shadow-lift"
          >
            <Search className="ml-2 h-5 w-5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a store or deal…"
              className="h-11 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="lg" className="h-11">Search</Button>
          </form>
        </div>
      </section>

      <div className="container-page mt-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.label}
              onClick={() => setSearch({ type: t.id })}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                search.type === t.id ? "border-forest bg-forest text-forest-foreground" : "border-border bg-card hover:border-primary"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label} <span className="opacity-60">{t.count}</span>
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSearch({ cat: undefined })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${!activeCat ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
            >
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSearch({ cat: c.slug })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${activeCat?.id === c.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}
              </button>
            ))}
          </div>
        )}

        {search.q && (
          <p className="mt-4 text-sm text-muted-foreground">
            {filtered.length} results for “{search.q}”{" "}
            <button className="font-semibold text-primary" onClick={() => { setQ(""); setSearch({ q: undefined }); }}>Clear</button>
          </p>
        )}

        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              {offers.length === 0 ? "Deals are being imported — check back very soon." : "No offers match your search."}
            </div>
          ) : (
            filtered.slice(0, limit).map((o) => <OfferCard key={o.id} offer={o} settings={settings} />)
          )}
        </div>
        {filtered.length > limit && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="lg" onClick={() => setLimit((l) => l + PAGE)}>
              Show more offers ({filtered.length - limit} left)
            </Button>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

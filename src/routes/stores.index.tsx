import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { StoreCard } from "@/components/site/StoreCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { Button } from "@/components/ui/button";
import { categoriesQuery, settingsQuery, storesQuery } from "@/lib/public.functions";
import { displayRate } from "@/lib/cashback";
import { isBoosted } from "@/lib/referral";

type StoresSearch = { q?: string | undefined; cat?: string | undefined; sort?: "popular" | "rate" | "az" | "boosted" | undefined };

export const Route = createFileRoute("/stores/")({
  validateSearch: (s: Record<string, unknown>): StoresSearch => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    cat: typeof s["cat"] === "string" && s["cat"] ? s["cat"] : undefined,
    sort: s["sort"] === "rate" || s["sort"] === "az" || s["sort"] === "boosted" ? s["sort"] : undefined,
  }),
  loader: async ({ context }) => {
    const [settings] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(storesQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]);
    return { siteName: settings.site_name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `All cashback stores | ${name}`;
    const description = `Browse every store on ${name} and see how much cash back you earn.`;
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
  component: StoresPage,
});

const PAGE = 48;

function StoresPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/stores/" });
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: stores } = useSuspenseQuery(storesQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const [limit, setLimit] = useState(PAGE);

  const activeCat = categories.find((c) => c.slug === search.cat);

  const filtered = useMemo(() => {
    const q = (search.q ?? "").toLowerCase();
    let list = stores.filter(
      (s) => (!q || s.name.toLowerCase().includes(q)) && (!activeCat || s.category_id === activeCat.id),
    );
    if (search.sort === "boosted")
      list = list.filter((s) => isBoosted(s.previous_rate, displayRate(s, settings.default_cashback_percent)));
    if (search.sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (search.sort === "rate")
      list = [...list].sort(
        (a, b) =>
          (displayRate(b, settings.default_cashback_percent) ?? 0) -
          (displayRate(a, settings.default_cashback_percent) ?? 0),
      );
    return list;
  }, [stores, search.q, search.sort, activeCat, settings.default_cashback_percent]);

  return (
    <SiteShell>
      <section className="border-b border-border bg-secondary/50">
        <div className="container-page py-10">
          <h1 className="text-4xl font-extrabold">{activeCat ? activeCat.name : "All stores"}</h1>
          <p className="mt-2 text-muted-foreground">{filtered.length.toLocaleString()} stores paying cash back</p>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              defaultValue={search.q}
              onChange={(e) => {
                setLimit(PAGE);
                navigate({ search: (prev) => ({ ...prev, q: e.target.value || undefined }), replace: true });
              }}
              placeholder="Search by store name"
              className="h-12 w-full rounded-2xl border border-input bg-card pl-12 pr-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>
      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Categories</h3>
          <Link
            to="/stores"
            search={(prev) => ({ ...prev, cat: undefined })}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${!activeCat ? "bg-forest text-forest-foreground" : "hover:bg-secondary"}`}
          >
            All categories
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/stores"
              search={(prev) => ({ ...prev, cat: c.slug })}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${activeCat?.id === c.id ? "bg-forest text-forest-foreground" : "hover:bg-secondary"}`}
            >
              <CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}
            </Link>
          ))}
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-end gap-2 text-sm">
            <span className="text-muted-foreground">Sort:</span>
            {(
              [
                ["popular", "Popular"],
                ["rate", "Highest cashback"],
                ["boosted", "Boosted"],
                ["az", "A–Z"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigate({ search: (prev) => ({ ...prev, sort: key === "popular" ? undefined : key }) })}
                className={`rounded-full px-3 py-1 font-medium ${(search.sort ?? "popular") === key ? "bg-forest text-forest-foreground" : "bg-card hover:bg-secondary"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No stores match your search.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, limit).map((s) => (
                  <StoreCard key={s.id} store={s} settings={settings} />
                ))}
              </div>
              {filtered.length > limit && (
                <div className="mt-8 text-center">
                  <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                    Show more stores
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

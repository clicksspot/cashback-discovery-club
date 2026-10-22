import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { StoreCard } from "@/components/site/StoreCard";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { settingsQuery, storesQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "My favourite stores" },
      { name: "description", content: "Stores you've saved, with their latest cashback rates." },
      { property: "og:title", content: "My favourite stores" },
      { property: "og:description", content: "Stores you've saved, with their latest cashback rates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: stores = [] } = useQuery(storesQuery);
  const { ids } = useFavorites();
  const saved = stores.filter((s) => ids.has(s.id));

  return (
    <SiteShell>
      <div className="container-page py-12">
        <h1 className="text-4xl font-extrabold">Favourite stores</h1>
        <p className="mt-2 text-muted-foreground">Keep an eye on your go-to stores. Boosted rates show up here first.</p>
        {saved.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">No favourites yet</p>
            <p className="text-sm text-muted-foreground">Tap the heart on any store to save it here.</p>
            <Button asChild className="mt-5"><Link to="/stores" search={{}}>Browse stores</Link></Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {saved.map((s) => <StoreCard key={s.id} store={s} settings={settings} />)}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

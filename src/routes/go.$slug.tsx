import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StoreLogo } from "@/components/site/StoreLogo";
import { Logo } from "@/components/site/SiteShell";
import { offerLinkQuery, settingsQuery, storeQuery } from "@/lib/public.functions";
import { buildTrackingUrl, formatRate } from "@/lib/cashback";

type GoSearch = { offer?: string | undefined };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/go/$slug")({
  validateSearch: (s: Record<string, unknown>): GoSearch => ({
    offer: typeof s["offer"] === "string" && UUID_RE.test(s["offer"]) ? s["offer"] : undefined,
  }),
  loader: async ({ context, params }) => {
    const [, store] = await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(storeQuery(params.slug)),
    ]);
    if (!store) throw notFound();
    return { storeName: store.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Taking you to ${loaderData.storeName}…` : "Redirecting…" },
      { name: "description", content: "Activating your cashback and sending you to the store." },
      { property: "og:title", content: "Activating your cashback" },
      { property: "og:description", content: "Activating your cashback and sending you to the store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoPage,
});

function GoPage() {
  const { slug } = Route.useParams();
  const { offer: offerId } = Route.useSearch();
  const offerQ = useQuery({ ...offerLinkQuery(offerId ?? ""), enabled: !!offerId });
  const offerReady = !offerId || !offerQ.isLoading;
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: store } = useSuspenseQuery(storeQuery(slug));
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const offer = offerQ.data && store && offerQ.data.store_id === store.id ? offerQ.data : null;
  const link = offer?.tracking_link || store?.tracking_link || null;

  useEffect(() => {
    if (loading || !offerReady || !user || !store || !link || started.current) return;
    started.current = true;
    (async () => {
      const { data, error } = await supabase
        .from("clicks")
        .insert({ user_id: user.id, store_id: store.id, offer_id: offer?.id ?? null })
        .select("id")
        .single();
      if (error || !data) {
        setError("We couldn't activate cashback. Please try again.");
        started.current = false;
        return;
      }
      window.location.href = buildTrackingUrl(link, data.id);
    })();
  }, [loading, offerReady, user, store, link, offer]);

  if (!store) return null;
  const rate = formatRate(store, settings.default_cashback_percent, settings.currency);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hero px-6 text-center text-forest-foreground">
      <Logo name={settings.site_name} light />
      <StoreLogo name={store.name} src={store.logo_url} className="mt-10 h-24 w-24" />
      {!link ? (
        <p className="mt-6 text-lg">This store isn't accepting new visits right now.</p>
      ) : loading || user ? (
        <>
          {offer?.code && (
            <p className="mt-6 rounded-xl border-2 border-dashed border-lime px-4 py-2 font-mono text-lg font-bold tracking-widest">Your code: {offer.code}</p>
          )}
          <h1 className="mt-6 text-3xl font-extrabold">Activating {rate ? `${rate} ` : ""}cashback at {store.name}</h1>
          {error ? (
            <p className="mt-4 text-lime">{error}</p>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-forest-foreground/75"><Loader2 className="h-4 w-4 animate-spin" /> Taking you to the store…</p>
          )}
        </>
      ) : (
        <>
          <h1 className="mt-6 max-w-lg text-3xl font-extrabold">Sign in to earn {rate ? `${rate} ` : ""}cashback at {store.name}</h1>
          <p className="mt-3 max-w-md text-forest-foreground/75">We can only pay you if we know who you are when you visit the store.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="lg">
              <Link to="/auth" search={{ redirect: `/go/${store.slug}${offer ? `?offer=${offer.id}` : ""}` }}>Sign in & continue</Link>
            </Button>
            <Button asChild variant="outline-light" size="lg">
              <a href={link} rel="nofollow noopener">Continue without cashback</a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

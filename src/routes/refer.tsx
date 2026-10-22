import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Copy, Gift, Share2, UserPlus, Wallet } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { settingsQuery } from "@/lib/public.functions";
import { formatMoney } from "@/lib/cashback";
import { referralLink } from "@/lib/referral";

export const Route = createFileRoute("/refer")({
  loader: async ({ context }) => {
    const s = await context.queryClient.ensureQueryData(settingsQuery);
    return { siteName: s.site_name, bonus: formatMoney(s.referral_bonus, s.currency) };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `Refer a friend, earn ${loaderData?.bonus ?? "a bonus"} | ${name}`;
    const description = `Invite friends to ${name}. When their first cashback is approved, you get a bonus.`;
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
  component: ReferPage,
});

function ReferPage() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { user } = useAuth();
  const bonus = formatMoney(s.referral_bonus, s.currency);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const profile = useQuery({
    queryKey: ["my-ref-code", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("referral_code").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.referral_code ?? null;
    },
  });
  const friends = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_referrals");
      if (error) throw error;
      return data ?? [];
    },
  });

  const link = profile.data && origin ? referralLink(origin, profile.data) : "";
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: s.site_name, text: `Join me on ${s.site_name} and get cash back when you shop.`, url: link }).catch(() => {});
    else copy();
  };
  const paid = friends.data?.filter((f) => f.bonus_paid).length ?? 0;

  return (
    <SiteShell>
      <section className="bg-hero text-forest-foreground">
        <div className="container-page grid gap-10 py-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-sm font-bold text-lime-foreground"><Gift className="h-4 w-4" /> Refer & earn</p>
            <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">Get {bonus} for every friend you invite</h1>
            <p className="mt-3 max-w-md text-forest-foreground/75">Share your link. When your friend joins and their first cashback is approved, {bonus} lands in your balance.</p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-lift">
            {user ? (
              <>
                <p className="text-sm font-semibold">Your personal link</p>
                <div className="mt-2 flex gap-2">
                  <Input readOnly value={link || "Loading…"} onFocus={(e) => e.currentTarget.select()} />
                  <Button onClick={copy} disabled={!link} aria-label="Copy link"><Copy /></Button>
                </div>
                <Button variant="forest" className="mt-3 w-full" onClick={share} disabled={!link}><Share2 /> Share with friends</Button>
                <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-secondary p-3"><p className="text-2xl font-extrabold">{friends.data?.length ?? 0}</p><p className="text-xs text-muted-foreground">Friends joined</p></div>
                  <div className="rounded-xl bg-secondary p-3"><p className="text-2xl font-extrabold">{formatMoney(paid * s.referral_bonus, s.currency)}</p><p className="text-xs text-muted-foreground">Bonuses earned</p></div>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold">Sign in to get your personal link</p>
                <Button asChild className="mt-4 w-full"><Link to="/auth" search={{ redirect: "/refer" }}>Sign in or join free</Link></Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="container-page mt-12 grid gap-6 md:grid-cols-3">
        {[
          [Share2, "1. Share your link", "Send it by WhatsApp, email or social media."],
          [UserPlus, "2. Friend joins free", "They sign up using your link and shop through us."],
          [Wallet, `3. You get ${bonus}`, "Paid when their first cashback is approved by the store."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Gift;
          return (
            <div key={t as string} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <I className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-bold">{t as string}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d as string}</p>
            </div>
          );
        })}
      </div>

      {user && (friends.data?.length ?? 0) > 0 && (
        <div className="container-page mt-10">
          <h2 className="text-xl font-bold">Your referrals</h2>
          <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
            {friends.data!.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-semibold">{f.friend_name}</span>
                <span className="text-muted-foreground">Joined {format(new Date(f.joined_at), "d MMM yyyy")}</span>
                <span className={f.bonus_paid ? "font-bold text-primary" : "text-muted-foreground"}>{f.bonus_paid ? `${bonus} earned` : "Waiting for first purchase"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SiteShell>
  );
}

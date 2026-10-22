import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, MousePointerClick, ShoppingCart, Wallet } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/public.functions";
import { PAYOUT_METHODS } from "@/lib/settings";

export const Route = createFileRoute("/how-it-works")({
  loader: async ({ context }) => {
    const settings = await context.queryClient.ensureQueryData(settingsQuery);
    return { siteName: settings.site_name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `How cashback works | ${name}`;
    const description = `See how ${name} pays you cash back on online shopping, and how to withdraw it.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: HowItWorks,
});

function HowItWorks() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const methods = PAYOUT_METHODS.filter((m) => settings[m.settingKey]).map((m) => m.label);
  const steps = [
    { icon: MousePointerClick, title: "Sign in and pick a store", text: "Browse our stores, open the one you want and click “Shop now”. We send you to the store with a special tracking link." },
    { icon: ShoppingCart, title: "Shop like you normally do", text: "Complete your purchase on the store's website. The store pays us a commission for sending you." },
    { icon: BadgeCheck, title: "We share the money with you", text: "Your cashback appears as pending, usually within a few days. It becomes available once the store confirms your order." },
    { icon: Wallet, title: "Withdraw your cash", text: `When you have at least $${settings.min_withdrawal} available, withdraw to ${methods.join(", ") || "your preferred method"}.` },
  ];
  return (
    <SiteShell>
      <section className="bg-hero text-forest-foreground">
        <div className="container-page py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold md:text-5xl">Getting paid to shop is simple.</h1>
          <p className="mx-auto mt-4 max-w-xl text-forest-foreground/75">Stores pay {settings.site_name} for every sale we send them. We pass a big share of that straight back to you.</p>
        </div>
      </section>
      <div className="container-page mt-12 grid gap-5 md:grid-cols-2">
        {steps.map((s, i) => (
          <div key={s.title} className="flex gap-5 rounded-2xl border border-border bg-card p-7 shadow-card">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime text-lime-foreground"><s.icon className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Step {i + 1}</p>
              <h2 className="mt-1 text-xl font-bold">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="container-page mt-12 text-center">
        <Button asChild size="lg"><Link to="/stores" search={{}}>Start shopping <ArrowRight /></Link></Button>
      </div>
    </SiteShell>
  );
}

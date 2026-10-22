import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LifeBuoy, Mail, ShieldCheck, Wallet } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/public.functions";
import { formatMoney } from "@/lib/cashback";

export const Route = createFileRoute("/help")({
  loader: async ({ context }) => {
    const s = await context.queryClient.ensureQueryData(settingsQuery);
    return { siteName: s.site_name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    const title = `Help centre & FAQ | ${name}`;
    const description = `Answers about tracking, payouts, missing cashback and referrals on ${name}.`;
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
  component: HelpPage,
});

function HelpPage() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const groups: { title: string; icon: typeof Wallet; items: [string, string][] }[] = [
    {
      title: "Earning cashback",
      icon: ShieldCheck,
      items: [
        ["How does it work?", `Stores pay ${s.site_name} a commission when you shop through our links. We pass a share of it back to you as cashback.`],
        ["Why do I need to sign in before clicking Shop now?", "Signing in lets us attach a unique tracking ID to your visit, so the store's sale report can be matched to your account."],
        ["How long until my cashback shows up?", "Most purchases appear as pending within 1–3 days. Some stores take up to 7 days to report."],
        ["What can stop cashback tracking?", "Ad blockers, private browsing, using other coupon or cashback sites, or leaving the store and coming back later can break tracking. Click Shop now right before you buy."],
        ["Why is my cashback pending?", "Stores wait until their return window has passed before confirming. Once confirmed, it moves to available and you can withdraw it."],
      ],
    },
    {
      title: "Payouts",
      icon: Wallet,
      items: [
        ["How do I withdraw?", `Go to My cashback → Withdraw. The minimum withdrawal is ${formatMoney(s.min_withdrawal, s.currency)}.`],
        ["Which payout methods are available?", "PayPal, bank transfer, JazzCash and Easypaisa, depending on what is switched on at the time."],
        ["How long does a payout take?", "We review withdrawal requests and normally pay them within a few working days."],
      ],
    },
    {
      title: "Problems & referrals",
      icon: LifeBuoy,
      items: [
        ["My purchase never appeared — what now?", "If 7 days have passed, submit a missing cashback claim with your order number. We'll chase it with the store."],
        ["How does refer-a-friend work?", `Share your personal link. When your friend joins and their first cashback is approved, you get a ${formatMoney(s.referral_bonus, s.currency)} bonus.`],
        ["Can I delete my account?", s.support_email ? `Yes — email ${s.support_email} from your account email address.` : "Yes — contact our support team from your account email address."],
      ],
    },
  ];

  return (
    <SiteShell>
      <section className="bg-hero text-forest-foreground">
        <div className="container-page py-14">
          <h1 className="text-4xl font-extrabold md:text-5xl">How can we help?</h1>
          <p className="mt-3 max-w-xl text-forest-foreground/75">Quick answers about tracking, payouts and your account.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero"><Link to="/claims">Report missing cashback</Link></Button>
            {s.support_email && (
              <Button asChild variant="outline"><a href={`mailto:${s.support_email}`}><Mail /> Email support</a></Button>
            )}
          </div>
        </div>
      </section>
      <div className="container-page mt-12 grid gap-10 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="flex items-center gap-2 text-xl font-bold"><g.icon className="h-5 w-5 text-primary" /> {g.title}</h2>
            <Accordion type="single" collapsible className="mt-3 rounded-2xl border border-border bg-card px-5 shadow-card">
              {g.items.map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/site/LegalPage";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/terms")({
  loader: async ({ context }) => ({ siteName: (await context.queryClient.ensureQueryData(settingsQuery)).site_name }),
  head: ({ loaderData }) => {
    const title = `Terms of use | ${loaderData?.siteName ?? "CashLeaf"}`;
    const description = "The rules for earning, tracking and withdrawing cashback.";
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
  component: TermsPage,
});

function TermsPage() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const n = s.site_name;
  return (
    <LegalPage
      title="Terms of use"
      updated="October 2026"
      sections={[
        ["Your account", `You must be 18 or older to join ${n}. One account per person. Keep your sign-in details private.`],
        ["How cashback is earned", `Cashback is paid only when a store confirms your purchase and pays ${n} its commission. Rates shown are indicative and can change at any time; the rate at the time of purchase applies.`],
        ["Pending and declined cashback", "Cashback stays pending until the store confirms it. Returned, cancelled or fraudulent orders are declined."],
        ["Withdrawals", "Only available (approved) cashback can be withdrawn, above the minimum amount shown in your account. We may ask you to verify your identity before paying."],
        ["Referral bonuses", "Referral bonuses are paid once per referred friend, after their first cashback is approved. Self-referrals and fake accounts are not allowed."],
        ["Misuse", "We may block accounts and cancel cashback where we see abuse, such as fake orders or multiple accounts."],
        ["Changes", "We may update these terms. Continuing to use the site means you accept the latest version."],
      ]}
    />
  );
}

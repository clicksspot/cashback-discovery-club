import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/site/LegalPage";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/privacy")({
  loader: async ({ context }) => ({ siteName: (await context.queryClient.ensureQueryData(settingsQuery)).site_name }),
  head: ({ loaderData }) => {
    const title = `Privacy policy | ${loaderData?.siteName ?? "CashLeaf"}`;
    const description = "What information we collect, why, and how we keep it safe.";
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
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  return (
    <LegalPage
      title="Privacy policy"
      updated="October 2026"
      sections={[
        ["What we collect", "Your name and email, the stores you click through to, purchases reported by stores, and the payout details you give us."],
        ["Why we collect it", "To track your cashback, pay you, prevent fraud, and send important account emails."],
        ["Who we share it with", "Stores and affiliate networks receive an anonymous tracking ID — never your name or email. Payout providers receive only what's needed to pay you."],
        ["Cookies", "We use essential cookies and local storage to keep you signed in and remember referral links."],
        ["Your rights", `You can ask to see, correct or delete your data${s.support_email ? ` by emailing ${s.support_email}` : " by contacting support"}.`],
      ]}
    />
  );
}

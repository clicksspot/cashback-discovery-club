import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { AmazonDeals } from "@/components/site/AmazonDeals";
import { amazonOffersQuery } from "@/lib/amazon.functions";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/amazon-deals")({
  loader: async ({ context }) => {
    const [settings] = await Promise.all([context.queryClient.ensureQueryData(settingsQuery), context.queryClient.ensureQueryData(amazonOffersQuery)]);
    return { siteName: settings.site_name };
  },
  head: ({ loaderData }) => {
    const title = `Amazon USA deals | ${loaderData?.siteName ?? "CashLeaf"}`;
    const description = "Explore selected Amazon USA products and check current prices directly on Amazon through our affiliate links.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: AmazonPage,
});

function AmazonPage() {
  const { data } = useSuspenseQuery(amazonOffersQuery);
  return <SiteShell><AmazonDeals offers={data} /></SiteShell>;
}
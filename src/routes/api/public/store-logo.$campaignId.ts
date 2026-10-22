import { createFileRoute } from "@tanstack/react-router";

// Serves store logos from Impact (which require our API login) as plain public images.
export const Route = createFileRoute("/api/public/store-logo/$campaignId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^\d{1,12}$/.test(params.campaignId)) return new Response("Not found", { status: 404 });
        const { impactConfigured, impactRaw } = await import("@/lib/impact.server");
        if (!impactConfigured()) return new Response("Not found", { status: 404 });
        const sid = process.env["IMPACT_ACCOUNT_SID"]!;
        const res = await impactRaw(`/Mediapartners/${sid}/Campaigns/${params.campaignId}/Logo`, "*/*").catch(() => null);
        const type = res?.headers.get("content-type") ?? "";
        if (!res || !res.ok || !type.startsWith("image/")) return new Response("Not found", { status: 404 });
        return new Response(res.body, {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=604800, s-maxage=604800",
          },
        });
      },
    },
  },
});

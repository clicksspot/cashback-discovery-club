import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/impact-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const body = (await request.json().catch(() => ({}))) as { task?: string };
        const kind = body.task === "stores" || body.task === "actions" || body.task === "offers" ? body.task : "all";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runImpactSync, impactConfigured } = await import("@/lib/impact.server");
        if (!(await impactConfigured())) return Response.json({ skipped: true, reason: "Impact not connected" });
        try {
          const result = await runImpactSync(supabaseAdmin, kind, "cron");
          return Response.json({ success: true, ...result });
        } catch (e) {
          return Response.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
      },
    },
  },
});

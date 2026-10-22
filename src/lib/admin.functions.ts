import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: (...args: never[]) => unknown }; userId: string }) {
  const sb = context.supabase as unknown as {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: boolean | null }>;
  };
  const { data } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only admins can do this.");
}

export const getImpactStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { impactConfigured } = await import("./impact.server");
    return { configured: impactConfigured() };
  });

export const runSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "all" | "stores" | "actions" | "offers" }) =>
    z.object({ kind: z.enum(["all", "stores", "actions", "offers"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runImpactSync } = await import("./impact.server");
    const result = await runImpactSync(supabaseAdmin, data.kind, "manual");
    return { skipped: result.skipped, summary: JSON.stringify(result) };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-access";

export const getImpactStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { impactConfigured } = await import("./impact.server");
    return { configured: await impactConfigured() };
  });

export const updateImpactCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sid: string; token: string }) => {
    const parsed = z.object({ sid: z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/), token: z.string().trim().min(1).max(1024).regex(/^[\x21-\x7e]+$/) }).safeParse(input);
    if (!parsed.success) throw new Error("Enter a valid Impact Account SID and Auth Token.");
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { saveImpactCredentials } = await import("./impact.server");
    await saveImpactCredentials(data, context.userId);
    return { configured: true };
  });

export const runSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "all" | "stores" | "actions" | "offers" }) =>
    z.object({ kind: z.enum(["all", "stores", "actions", "offers"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runImpactSync } = await import("./impact.server");
    const result = await runImpactSync(supabaseAdmin, data.kind, "manual");
    return { skipped: result.skipped, summary: JSON.stringify(result) };
  });

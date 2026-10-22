import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/cashback";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/claims")({
  component: AdminClaims,
});

function AdminClaims() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const list = useQuery({
    queryKey: ["admin", "claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, user_id, order_ref, order_date, order_amount, details, status, admin_note, created_at, stores(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: "resolved" | "rejected") => {
    const note = window.prompt("Note for the member (optional)") ?? null;
    const { error } = await supabase.from("claims").update({ status, admin_note: note || null }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Claim ${status}`);
    qc.invalidateQueries({ queryKey: ["admin", "claims"] });
  };

  return (
    <div>
      <AdminHeader title="Missing cashback" description="Claims from members whose purchases didn't track. Add the cashback under Cashback & sales, then resolve." />
      <div className="space-y-3">
        {(list.data ?? []).map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{c.stores?.name ?? "Store"} · #{c.order_ref}</p>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordered {format(new Date(c.order_date), "d MMM yyyy")} · {formatMoney(c.order_amount, settings.currency)} · sent {format(new Date(c.created_at), "d MMM")}
            </p>
            {c.details && <p className="mt-2 text-sm">{c.details}</p>}
            {c.status === "open" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setStatus(c.id, "resolved")}>Resolve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "rejected")}>Reject</Button>
              </div>
            )}
          </div>
        ))}
        {list.data?.length === 0 && <p className="text-muted-foreground">No claims yet.</p>}
      </div>
    </div>
  );
}

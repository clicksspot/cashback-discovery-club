import { createFileRoute } from "@tanstack/react-router";
import { adminHead } from "@/lib/admin-head";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAllRows } from "@/lib/fetch-all";
import { formatMoney } from "@/lib/cashback";
import { payoutLabel } from "@/lib/settings";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => adminHead("Withdrawals", "Review and process CashLeaf member withdrawal requests."),
  component: AdminWithdrawals,
});

type Action = { id: string; status: "approved" | "paid" | "rejected" };

function AdminWithdrawals() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const [tab, setTab] = useState("pending");
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const list = useQuery({
    queryKey: ["admin", "withdrawals"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).range(f, t)),
  });
  const profiles = useQuery({
    queryKey: ["admin", "profiles-min"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("profiles").select("id, email, full_name").range(f, t)),
  });
  const emailOf = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.email ?? p.full_name ?? ""])), [profiles.data]);
  const rows = (list.data ?? []).filter((w) => tab === "all" || w.status === tab);

  const apply = async () => {
    if (!action) return;
    const { error } = await supabase
      .from("withdrawals")
      .update({ status: action.status, admin_note: note || null, processed_at: new Date().toISOString() })
      .eq("id", action.id);
    if (error) return void toast.error(error.message);
    toast.success(action.status === "rejected" ? "Rejected — the money returns to the member's balance" : `Marked as ${action.status}`);
    setAction(null);
    setNote("");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div>
      <AdminHeader title="Withdrawals" description="Pay members using the details they entered, then mark the request as paid." />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-3">
        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">Nothing here.</div>}
        {rows.map((w) => (
          <div key={w.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-2xl font-extrabold">{formatMoney(w.amount, settings.currency)}</span>
                <StatusBadge status={w.status} />
              </div>
              <p className="text-sm font-medium">{emailOf.get(w.user_id) ?? w.user_id} · {payoutLabel(w.method)}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm text-muted-foreground">
                {Object.entries((w.details ?? {}) as Record<string, string>).map(([k, v]) => (
                  <><dt key={k + "k"} className="capitalize">{k.replace(/_/g, " ")}:</dt><dd key={k + "v"} className="font-mono text-foreground">{String(v)}</dd></>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">Requested {format(new Date(w.created_at), "MMM d, yyyy · h:mm a")}</p>
              {w.admin_note && <p className="text-xs">Note: {w.admin_note}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {w.status === "pending" && <Button size="sm" variant="outline" onClick={() => setAction({ id: w.id, status: "approved" })}>Approve</Button>}
              {(w.status === "pending" || w.status === "approved") && <Button size="sm" onClick={() => setAction({ id: w.id, status: "paid" })}>Mark paid</Button>}
              {(w.status === "pending" || w.status === "approved") && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setAction({ id: w.id, status: "rejected" })}>Reject</Button>}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{action?.status === "paid" ? "Mark as paid" : action?.status === "rejected" ? "Reject withdrawal" : "Approve withdrawal"}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Note for the member (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={action?.status === "paid" ? "e.g. PayPal transaction ID" : ""} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant={action?.status === "rejected" ? "destructive" : "default"} onClick={apply}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

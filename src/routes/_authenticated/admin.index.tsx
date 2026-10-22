import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, StatCard } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { fetchAllRows } from "@/lib/fetch-all";
import { formatMoney } from "@/lib/cashback";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const cur = settings.currency;
  const stats = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [storesAll, storesActive, members, pendingW, tx, lastSync] = await Promise.all([
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("withdrawals").select("amount").eq("status", "pending"),
        fetchAllRows((f, t) => supabase.from("transactions").select("status, commission_amount, cashback_amount, user_id").range(f, t)),
        supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const sum = (rows: { commission_amount: number; cashback_amount: number }[], k: "commission_amount" | "cashback_amount") =>
        rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
      const live = tx.filter((t) => t.status !== "declined");
      return {
        storesAll: storesAll.count ?? 0,
        storesActive: storesActive.count ?? 0,
        members: members.count ?? 0,
        pendingWithdrawals: (pendingW.data ?? []).reduce((a, r) => a + Number(r.amount), 0),
        pendingWithdrawalCount: pendingW.data?.length ?? 0,
        commission: sum(live, "commission_amount"),
        cashback: sum(live, "cashback_amount"),
        unmatched: tx.filter((t) => !t.user_id).length,
        sales: tx.length,
        lastSync: lastSync.data,
      };
    },
  });
  const recent = useQuery({
    queryKey: ["admin", "recent-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, store_name, commission_amount, cashback_amount, status, event_date, user_id")
        .order("event_date", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const s = stats.data;
  return (
    <div>
      <AdminHeader title="Overview" description="How your cashback site is doing.">
        <Button asChild><Link to="/admin/sync">Sync with Impact</Link></Button>
      </AdminHeader>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Live stores" value={s ? `${s.storesActive} / ${s.storesAll}` : "…"} hint="visible / total imported" />
        <StatCard label="Members" value={s?.members ?? "…"} />
        <StatCard label="Your profit" value={s ? formatMoney(s.commission - s.cashback, cur) : "…"} hint={s ? `${formatMoney(s.commission, cur)} commission − ${formatMoney(s.cashback, cur)} cashback` : undefined} />
        <StatCard label="Pending payouts" value={s ? formatMoney(s.pendingWithdrawals, cur) : "…"} hint={s ? `${s.pendingWithdrawalCount} requests waiting` : undefined} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Latest sales</h2>
            <Link to="/admin/transactions" className="text-sm font-semibold text-primary">View all</Link>
          </div>
          {recent.data && recent.data.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {recent.data.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-2">{format(new Date(t.event_date), "MMM d")}</td>
                    <td className="py-2 font-medium">{t.store_name ?? "—"}</td>
                    <td className="py-2 text-right">{formatMoney(t.commission_amount, cur)}</td>
                    <td className="py-2 text-right text-muted-foreground">{t.user_id ? formatMoney(t.cashback_amount, cur) : "no member"}</td>
                    <td className="py-2 text-right"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No sales yet. They appear here after a sync.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-bold">Last Impact sync</h2>
          {s?.lastSync ? (
            <div className="mt-3 space-y-2 text-sm">
              <StatusBadge status={s.lastSync.status} />
              <p className="text-muted-foreground">{format(new Date(s.lastSync.started_at), "MMM d, yyyy · h:mm a")}</p>
              {s.lastSync.message && <p className="break-words">{s.lastSync.message}</p>}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Never synced yet.</p>
          )}
          {s && s.unmatched > 0 && (
            <p className="mt-4 rounded-lg bg-warning/20 p-3 text-xs text-warning-foreground">
              {s.unmatched} of {s.sales} sales aren't linked to a member (e.g. bought without signing in). You can assign them manually.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

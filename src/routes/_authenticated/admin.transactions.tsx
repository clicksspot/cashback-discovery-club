import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Lock, Pencil, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AdminHeader, StatCard } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllRows } from "@/lib/fetch-all";
import { computeCashback, effectiveShare, formatMoney } from "@/lib/cashback";
import { settingsQuery } from "@/lib/public.functions";

type Tx = Database["public"]["Tables"]["transactions"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

const PAGE = 50;

function AdminTransactions() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const cur = settings.currency;
  const tx = useQuery({
    queryKey: ["admin", "transactions"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("transactions").select("*").order("event_date", { ascending: false }).range(f, t)),
  });
  const profiles = useQuery({
    queryKey: ["admin", "profiles-min"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("profiles").select("id, email, full_name").range(f, t)),
  });
  const stores = useQuery({
    queryKey: ["admin", "stores-min"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("stores").select("id, name, cashback_share").order("name").range(f, t)),
  });
  const emailOf = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.id, p.email ?? p.full_name ?? p.id])), [profiles.data]);

  const [status, setStatus] = useState("all");
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partial<Tx> | null>(null);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (tx.data ?? []).filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (who === "matched" && !t.user_id) return false;
      if (who === "unmatched" && t.user_id) return false;
      if (s && !(t.store_name ?? "").toLowerCase().includes(s) && !(emailOf.get(t.user_id ?? "") ?? "").toLowerCase().includes(s) && !(t.impact_action_id ?? "").includes(s)) return false;
      return true;
    });
  }, [tx.data, status, who, q, emailOf]);

  const totals = useMemo(() => {
    const live = list.filter((t) => t.status !== "declined");
    const c = live.reduce((a, t) => a + Number(t.commission_amount), 0);
    const cb = live.reduce((a, t) => a + Number(t.cashback_amount), 0);
    return { c, cb, profit: c - cb };
  }, [list]);

  const rows = list.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <AdminHeader title="Cashback & sales" description="Every sale reported by Impact. Edit, approve, decline or assign to a member.">
        <Button onClick={() => setEditing({ status: "pending", source: "manual", order_amount: 0, commission_amount: 0, cashback_amount: 0, currency: cur, event_date: new Date().toISOString() })}>
          <Plus /> Add manual cashback
        </Button>
      </AdminHeader>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Commission (filtered)" value={formatMoney(totals.c, cur)} />
        <StatCard label="Cashback to members" value={formatMoney(totals.cb, cur)} />
        <StatCard label="Your profit" value={formatMoney(totals.profit, cur)} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Store, member email or sale ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={who} onValueChange={(v) => { setWho(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sales</SelectItem>
            <SelectItem value="matched">Linked to a member</SelectItem>
            <SelectItem value="unmatched">Not linked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Date</th><th className="p-3">Store</th><th className="p-3">Member</th><th className="p-3 text-right">Order</th><th className="p-3 text-right">Commission</th><th className="p-3 text-right">Cashback</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {tx.isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!tx.isLoading && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No sales found.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap">{format(new Date(t.event_date), "MMM d, yyyy")}</td>
                <td className="p-3 font-medium">{t.store_name ?? "—"}{t.source === "manual" && <span className="ml-1 text-xs text-muted-foreground">(manual)</span>}</td>
                <td className="p-3">{t.user_id ? emailOf.get(t.user_id) ?? "member" : <span className="text-warning-foreground">not linked</span>}</td>
                <td className="p-3 text-right">{formatMoney(t.order_amount, cur)}</td>
                <td className="p-3 text-right">{formatMoney(t.commission_amount, cur)}</td>
                <td className="p-3 text-right font-semibold">{formatMoney(t.cashback_amount, cur)}</td>
                <td className="p-3"><span className="flex items-center gap-1"><StatusBadge status={t.status} />{t.locked_by_admin && <Lock className="h-3 w-3 text-muted-foreground" />}</span></td>
                <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} of {list.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
      {editing && (
        <TxDialog
          tx={editing}
          profiles={profiles.data ?? []}
          stores={stores.data ?? []}
          defaultShare={settings.default_cashback_percent}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin"] }); }}
        />
      )}
    </div>
  );
}

function TxDialog({
  tx,
  profiles,
  stores,
  defaultShare,
  onClose,
  onSaved,
}: {
  tx: Partial<Tx>;
  profiles: { id: string; email: string | null }[];
  stores: { id: string; name: string; cashback_share: number | null }[];
  defaultShare: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Tx>>(tx);
  const [email, setEmail] = useState(profiles.find((p) => p.id === tx.user_id)?.email ?? "");
  const [busy, setBusy] = useState(false);
  const isNew = !tx.id;
  const set = <K extends keyof Tx>(k: K, v: Tx[K] | null) => setF((p) => ({ ...p, [k]: v }));

  const calc = () => {
    const store = stores.find((s) => s.id === f.store_id);
    set("cashback_amount", computeCashback(Number(f.commission_amount ?? 0), effectiveShare(store, defaultShare)));
  };

  const save = async () => {
    let userId: string | null = null;
    if (email.trim()) {
      const p = profiles.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
      if (!p) return void toast.error("No member with that email");
      userId = p.id;
    }
    setBusy(true);
    const store = stores.find((s) => s.id === f.store_id);
    const payload = {
      user_id: userId,
      store_id: f.store_id ?? null,
      store_name: store?.name ?? f.store_name ?? null,
      order_amount: Number(f.order_amount ?? 0),
      commission_amount: Number(f.commission_amount ?? 0),
      cashback_amount: Number(f.cashback_amount ?? 0),
      status: f.status ?? "pending",
      note: f.note ?? null,
      event_date: f.event_date ?? new Date().toISOString(),
      locked_by_admin: isNew ? true : f.locked_by_admin ?? true,
      source: f.source ?? "manual",
    };
    const { error } = isNew
      ? await supabase.from("transactions").insert(payload)
      : await supabase.from("transactions").update(payload).eq("id", tx.id!);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "Add manual cashback" : "Edit sale"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Member email (blank = not linked)</Label>
            <Input list="member-emails" value={email} onChange={(e) => setEmail(e.target.value)} />
            <datalist id="member-emails">{profiles.slice(0, 500).map((p) => p.email && <option key={p.id} value={p.email} />)}</datalist>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Store</Label>
            <Select value={f.store_id ?? "none"} onValueChange={(v) => set("store_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Choose store" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">{f.store_name ?? "No store"}</SelectItem>
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Order amount</Label><Input type="number" step="0.01" value={f.order_amount ?? 0} onChange={(e) => set("order_amount", Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Commission you earn</Label><Input type="number" step="0.01" value={f.commission_amount ?? 0} onChange={(e) => set("commission_amount", Number(e.target.value))} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Member cashback</Label>
            <div className="flex gap-2">
              <Input type="number" step="0.01" value={f.cashback_amount ?? 0} onChange={(e) => set("cashback_amount", Number(e.target.value))} />
              <Button type="button" variant="outline" size="sm" className="h-10" onClick={calc}>Auto</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={f.status ?? "pending"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved (withdrawable)</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Note</Label><Textarea rows={2} value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} /></div>
          {!isNew && f.source === "impact" && (
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={f.locked_by_admin ?? true} onCheckedChange={(v) => set("locked_by_admin", v)} />
              Keep my changes (don't let Impact sync overwrite this sale)
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

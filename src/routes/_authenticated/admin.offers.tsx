import { createFileRoute } from "@tanstack/react-router";
import { adminHead } from "@/lib/admin-head";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StoreLogo } from "@/components/site/StoreLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllRows } from "@/lib/fetch-all";
import { discountLabel } from "@/lib/offers";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type OfferWithStore = OfferRow & { stores: { name: string; logo_url: string | null } | null };

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => adminHead("Deals & coupons", "Manage CashLeaf deals, coupons and exclusive offers."),
  component: AdminOffers,
});

const PAGE = 50;

function isExpiredRow(o: OfferRow) {
  return o.impact_status === "Expired" || (!!o.ends_at && new Date(o.ends_at) < new Date());
}

function AdminOffers() {
  const qc = useQueryClient();
  const offers = useQuery({
    queryKey: ["admin", "offers"],
    queryFn: () =>
      fetchAllRows((f, t) =>
        supabase.from("offers").select("*, stores(name, logo_url)").order("created_at", { ascending: false }).range(f, t),
      ) as Promise<OfferWithStore[]>,
  });
  const stores = useQuery({
    queryKey: ["admin", "store-names"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("stores").select("id, name").order("name").range(f, t)),
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<OfferRow> | null>(null);

  const all = offers.data ?? [];
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return all.filter((r) => {
      if (s && !`${r.title} ${r.code ?? ""} ${r.stores?.name ?? ""}`.toLowerCase().includes(s)) return false;
      const expired = isExpiredRow(r);
      if (filter === "live" && (!r.is_active || expired)) return false;
      if (filter === "hidden" && (r.is_active || expired)) return false;
      if (filter === "expired" && !expired) return false;
      if (filter === "featured" && !r.is_featured) return false;
      if (filter === "codes" && !r.code) return false;
      if (filter === "deals" && r.code) return false;
      if (filter === "exclusive" && !r.is_exclusive) return false;
      if (filter === "locked" && !r.locked_by_admin) return false;
      if (filter === "manual" && r.source !== "manual") return false;
      return true;
    });
  }, [all, q, filter]);
  const pageRows = list.slice(page * PAGE, page * PAGE + PAGE);
  const liveCount = all.filter((r) => r.is_active && !isExpiredRow(r)).length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "offers"] });
    qc.invalidateQueries({ queryKey: ["public"] });
  };

  const patch = async (ids: string[], values: Partial<OfferRow>) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("offers").update(values).in("id", ids.slice(i, i + 200));
      if (error) return void toast.error(error.message);
    }
    refresh();
  };

  const bulk = async (values: Partial<OfferRow>) => {
    await patch([...selected], values);
    toast.success(`Updated ${selected.size} offers`);
    setSelected(new Set());
  };

  const remove = async (r: OfferRow) => {
    if (!confirm(`Delete “${r.title}”?`)) return;
    const { error } = await supabase.from("offers").delete().eq("id", r.id);
    if (error) return void toast.error(error.message);
    toast.success("Offer deleted");
    refresh();
  };

  return (
    <div>
      <AdminHeader
        title="Deals & coupons"
        description={`${all.length} offers, ${liveCount} live on the site. Imported automatically from Impact — edit, hide or add your own.`}
      >
        <Button onClick={() => setEditing({ is_active: true, kind: "deal", source: "manual", sort_order: 0 })}>
          <Plus /> Add offer
        </Button>
      </AdminHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search offer, code or store" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All offers</SelectItem>
            <SelectItem value="live">Live on site</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="codes">Coupon codes</SelectItem>
            <SelectItem value="deals">Deals (no code)</SelectItem>
            <SelectItem value="exclusive">Exclusive</SelectItem>
            <SelectItem value="locked">Edited by you</SelectItem>
            <SelectItem value="manual">Added by you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-forest p-3 text-sm text-forest-foreground">
          <span className="font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="hero" onClick={() => bulk({ is_active: true })}>Show</Button>
          <Button size="sm" variant="outline-light" onClick={() => bulk({ is_active: false })}>Hide</Button>
          <Button size="sm" variant="outline-light" onClick={() => bulk({ is_featured: true })}>Feature</Button>
          <Button size="sm" variant="outline-light" onClick={() => bulk({ is_featured: false })}>Unfeature</Button>
          <Button size="sm" variant="outline-light" onClick={() => bulk({ is_exclusive: true })}>Mark exclusive</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 p-3">
                <Checkbox
                  checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                  onCheckedChange={(v) => {
                    const next = new Set(selected);
                    pageRows.forEach((r) => (v ? next.add(r.id) : next.delete(r.id)));
                    setSelected(next);
                  }}
                />
              </th>
              <th className="p-3">Offer</th>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Ends</th>
              <th className="p-3 text-center">Visible</th>
              <th className="p-3 text-center">Featured</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {offers.isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!offers.isLoading && pageRows.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No offers here. Run an Impact sync to import deals and coupons.</td></tr>
            )}
            {pageRows.map((r) => {
              const expired = isExpiredRow(r);
              return (
                <tr key={r.id} className={`border-t border-border ${expired ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) next.add(r.id); else next.delete(r.id);
                      setSelected(next);
                    }} />
                  </td>
                  <td className="max-w-md p-3">
                    <div className="flex items-center gap-3">
                      <StoreLogo name={r.stores?.name ?? "?"} src={r.stores?.logo_url ?? null} className="h-10 w-14 shrink-0" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.stores?.name ?? "No store"} · {r.source === "manual" ? "Added by you" : "Impact"}
                          {r.is_exclusive && " · Exclusive"}
                          {expired && " · expired"}
                          {r.locked_by_admin && <span className="ml-1 inline-flex items-center gap-0.5"><Lock className="h-3 w-3" /> edited</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{r.code ? <span className="rounded-md border border-dashed border-primary bg-secondary px-2 py-0.5 font-mono text-xs font-bold">{r.code}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 whitespace-nowrap">{discountLabel(r) ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 whitespace-nowrap">{r.ends_at ? format(new Date(r.ends_at), "MMM d, yyyy") : <span className="text-muted-foreground">No end</span>}</td>
                  <td className="p-3 text-center"><Switch checked={r.is_active} onCheckedChange={(v) => patch([r.id], { is_active: v })} /></td>
                  <td className="p-3 text-center"><Switch checked={r.is_featured} onCheckedChange={(v) => patch([r.id], { is_featured: v })} /></td>
                  <td className="p-3 whitespace-nowrap text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit"><Pencil /></Button>
                    {r.source === "manual" && (
                      <Button size="icon" variant="ghost" onClick={() => remove(r)} aria-label="Delete"><Trash2 className="text-destructive" /></Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length > PAGE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing {page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} of {list.length}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {editing && (
        <OfferDialog
          offer={editing}
          stores={stores.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function numOrNull(v: string) {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function OfferDialog({
  offer,
  stores,
  onClose,
  onSaved,
}: {
  offer: Partial<OfferRow>;
  stores: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !offer.id;
  const isImpact = offer.source === "impact";
  const [f, setF] = useState<Partial<OfferRow>>({ ...offer, locked_by_admin: isImpact ? true : offer.locked_by_admin ?? false });
  const [storeFilter, setStoreFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof OfferRow>(k: K, v: OfferRow[K] | null) => setF((p) => ({ ...p, [k]: v }));

  const discountValue = f.discount_type?.includes("percent") ? f.discount_percent : f.discount_amount;
  const shownStores = stores.filter((s) => s.id === f.store_id || s.name.toLowerCase().includes(storeFilter.toLowerCase())).slice(0, 200);

  const save = async () => {
    if (!f.title?.trim()) return void toast.error("Title is required");
    if (!f.store_id) return void toast.error("Choose a store");
    setBusy(true);
    const code = f.code?.trim() || null;
    const payload = {
      store_id: f.store_id,
      title: f.title.trim(),
      description: f.description?.trim() || null,
      code,
      kind: code ? "coupon" : "deal",
      discount_type: f.discount_type || null,
      discount_percent: f.discount_type?.includes("percent") ? f.discount_percent ?? null : null,
      discount_amount: f.discount_type?.includes("amount") ? f.discount_amount ?? null : null,
      discount_currency: f.discount_type?.includes("amount") ? f.discount_currency || "USD" : null,
      ends_at: f.ends_at || null,
      tracking_link: f.tracking_link?.trim() || null,
      is_active: f.is_active ?? true,
      is_featured: f.is_featured ?? false,
      is_exclusive: f.is_exclusive ?? false,
      locked_by_admin: f.locked_by_admin ?? false,
      sort_order: f.sort_order ?? 0,
      ...(f.ends_at && new Date(f.ends_at) > new Date() && f.impact_status === "Expired" ? { impact_status: "Active" } : {}),
    };
    const { error } = isNew
      ? await supabase.from("offers").insert({ ...payload, source: "manual" })
      : await supabase.from("offers").update(payload).eq("id", offer.id!);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(isNew ? "Offer added" : "Offer saved");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add a deal or coupon" : "Edit offer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Store</Label>
            <div className="flex gap-2">
              <Input placeholder="Filter stores…" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-40" />
              <Select value={f.store_id ?? ""} onValueChange={(v) => set("store_id", v)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a store" /></SelectTrigger>
                <SelectContent>
                  {shownStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 20% off everything" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Coupon code</Label>
            <Input value={f.code ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="Leave blank for a deal" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Ends on</Label>
            <Input
              type="date"
              value={f.ends_at ? f.ends_at.slice(0, 10) : ""}
              onChange={(e) => set("ends_at", e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Discount type</Label>
            <Select value={f.discount_type ?? "none"} onValueChange={(v) => set("discount_type", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No badge</SelectItem>
                <SelectItem value="percent">% off</SelectItem>
                <SelectItem value="up_to_percent">Up to % off</SelectItem>
                <SelectItem value="amount">$ off</SelectItem>
                <SelectItem value="up_to_amount">Up to $ off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Discount value</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              disabled={!f.discount_type}
              value={discountValue ?? ""}
              onChange={(e) => {
                const v = numOrNull(e.target.value);
                if (f.discount_type?.includes("percent")) set("discount_percent", v);
                else set("discount_amount", v);
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Link (optional)</Label>
            <Input value={f.tracking_link ?? ""} onChange={(e) => set("tracking_link", e.target.value)} placeholder="Leave blank to use the store's tracked link" />
            <p className="text-xs text-muted-foreground">Use an Impact tracking link so cashback still tracks.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">Lower numbers show first.</p>
          </div>
          <div className="space-y-3 pt-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} /> Visible on site</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_featured ?? false} onCheckedChange={(v) => set("is_featured", v)} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_exclusive ?? false} onCheckedChange={(v) => set("is_exclusive", v)} /> Exclusive badge</label>
          </div>
          {isImpact && (
            <label className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-sm sm:col-span-2">
              <Switch checked={f.locked_by_admin ?? false} onCheckedChange={(v) => set("locked_by_admin", v)} className="mt-0.5" />
              <span>
                <span className="font-semibold">Keep my changes</span>
                <span className="block text-xs text-muted-foreground">Impact sync won't overwrite this offer while this is on.</span>
              </span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{isNew ? "Add offer" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

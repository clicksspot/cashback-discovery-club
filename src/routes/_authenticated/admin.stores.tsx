import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
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
import { effectiveShare, formatRate, slugify } from "@/lib/cashback";
import { settingsQuery } from "@/lib/public.functions";

type StoreRow = Database["public"]["Tables"]["stores"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/stores")({
  component: AdminStores,
});

const PAGE = 50;

function AdminStores() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const stores = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: () => fetchAllRows((f, t) => supabase.from("stores").select("*").order("name").range(f, t)),
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Partial<StoreRow> | null>(null);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (stores.data ?? []).filter((r) => {
      if (s && !r.name.toLowerCase().includes(s) && !(r.impact_campaign_id ?? "").includes(s)) return false;
      if (filter === "active" && !r.is_active) return false;
      if (filter === "hidden" && r.is_active) return false;
      if (filter === "featured" && !r.is_featured) return false;
      if (filter === "norate" && r.commission_rate != null) return false;
      if (cat === "none" && r.category_id) return false;
      if (cat !== "all" && cat !== "none" && r.category_id !== cat) return false;
      return true;
    });
  }, [stores.data, q, filter, cat]);
  const pageRows = list.slice(page * PAGE, page * PAGE + PAGE);
  const catName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? "—";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "stores"] });
    qc.invalidateQueries({ queryKey: ["public"] });
  };

  const patch = async (ids: string[], values: Partial<StoreRow>) => {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("stores").update(values).in("id", ids.slice(i, i + 200));
      if (error) return void toast.error(error.message);
    }
    refresh();
  };

  const bulk = async (values: Partial<StoreRow>) => {
    await patch([...selected], values);
    toast.success(`Updated ${selected.size} stores`);
    setSelected(new Set());
  };

  return (
    <div>
      <AdminHeader title="Stores" description={`${stores.data?.length ?? 0} stores. Imported automatically from Impact — edit anything here.`}>
        <Button onClick={() => setEditing({ is_active: true, commission_type: "percent", rate_prefix: "Up to", source: "manual", sort_order: 0 })}>
          <Plus /> Add store
        </Button>
      </AdminHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name or Impact ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            <SelectItem value="active">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="norate">No commission rate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="none">No category</SelectItem>
            {categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          <Select onValueChange={(v) => bulk({ category_id: v === "none" ? null : v })}>
            <SelectTrigger className="h-8 w-44 border-forest-foreground/30 bg-transparent"><SelectValue placeholder="Set category…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
              <th className="p-3">Store</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Impact pays</th>
              <th className="p-3 text-right">Shopper gets</th>
              <th className="p-3 text-center">Visible</th>
              <th className="p-3 text-center">Featured</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {stores.isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!stores.isLoading && pageRows.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No stores yet. Run an Impact sync to import your approved stores.</td></tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => {
                    const next = new Set(selected);
                    if (v) next.add(r.id); else next.delete(r.id);
                    setSelected(next);
                  }} />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <StoreLogo name={r.name} src={r.logo_url} className="h-10 w-14" />
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.source === "impact" ? `Impact #${r.impact_campaign_id}` : "Manual"}
                        {r.impact_status === "Expired" && " · no longer approved"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">{catName(r.category_id)}</td>
                <td className="p-3 text-right">
                  {r.commission_rate != null ? (r.commission_type === "flat" ? `$${r.commission_rate}` : `${r.commission_rate}%`) : <span className="text-muted-foreground">unknown</span>}
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatRate(r, settings.default_cashback_percent, settings.currency) ?? "—"}
                  <p className="text-xs font-normal text-muted-foreground">
                    {r.display_rate_override != null ? "fixed rate" : `${effectiveShare(r, settings.default_cashback_percent)}% share`}
                  </p>
                </td>
                <td className="p-3 text-center"><Switch checked={r.is_active} onCheckedChange={(v) => patch([r.id], { is_active: v })} /></td>
                <td className="p-3 text-center">
                  <button onClick={() => patch([r.id], { is_featured: !r.is_featured })} aria-label="Toggle featured">
                    <Star className={`h-5 w-5 ${r.is_featured ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                </td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil /></Button>
                </td>
              </tr>
            ))}
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
        <StoreDialog
          store={editing}
          categories={categories.data ?? []}
          defaultShare={settings.default_cashback_percent}
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
  return Number.isFinite(n) ? n : null;
}

function StoreDialog({
  store,
  categories,
  defaultShare,
  onClose,
  onSaved,
}: {
  store: Partial<StoreRow>;
  categories: { id: string; name: string }[];
  defaultShare: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<StoreRow>>(store);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof StoreRow>(k: K, v: StoreRow[K] | null) => setF((p) => ({ ...p, [k]: v }));
  const isNew = !store.id;

  const save = async () => {
    if (!f.name?.trim()) return void toast.error("Store name is required");
    setBusy(true);
    const payload = { ...f, name: f.name.trim(), slug: (f.slug?.trim() || slugify(f.name)).toLowerCase() };
    const { error } = isNew
      ? await supabase.from("stores").insert(payload as Database["public"]["Tables"]["stores"]["Insert"])
      : await supabase.from("stores").update(payload).eq("id", store.id!);
    setBusy(false);
    if (error) return void toast.error(error.message.includes("duplicate") ? "That web address (slug) is already used" : error.message);
    toast.success("Store saved");
    onSaved();
  };

  const remove = async () => {
    if (!confirm("Delete this store? It may be re-imported on the next Impact sync — hiding is usually better.")) return;
    const { error } = await supabase.from("stores").delete().eq("id", store.id!);
    if (error) return void toast.error(error.message);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Add store" : `Edit ${store.name}`}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Web address (slug)"><Input value={f.slug ?? ""} placeholder="auto from name" onChange={(e) => set("slug", e.target.value)} /></Field>
          <Field label="Category">
            <Select value={f.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sort order (lower shows first)"><Input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} /></Field>
          <Field label="Logo image URL" full><Input value={f.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value || null)} /></Field>
          <Field label="Tracking link (affiliate URL)" full><Input value={f.tracking_link ?? ""} onChange={(e) => set("tracking_link", e.target.value || null)} /></Field>
          <Field label="Store website" full><Input value={f.website_url ?? ""} onChange={(e) => set("website_url", e.target.value || null)} /></Field>

          <div className="rounded-xl bg-secondary/60 p-4 sm:col-span-2">
            <p className="mb-3 text-sm font-semibold">Cashback rate</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Commission type">
                <Select value={f.commission_type ?? "percent"} onValueChange={(v) => set("commission_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent of sale</SelectItem>
                    <SelectItem value="flat">Flat amount</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Impact pays you"><Input type="number" step="0.01" value={f.commission_rate ?? ""} onChange={(e) => set("commission_rate", numOrNull(e.target.value))} /></Field>
              <Field label={`Shopper share % (blank = ${defaultShare}%)`}><Input type="number" step="0.01" min={0} max={100} value={f.cashback_share ?? ""} onChange={(e) => set("cashback_share", numOrNull(e.target.value))} /></Field>
              <Field label="Fixed rate shown (optional)"><Input type="number" step="0.01" value={f.display_rate_override ?? ""} onChange={(e) => set("display_rate_override", numOrNull(e.target.value))} /></Field>
              <Field label="Text before rate"><Input value={f.rate_prefix ?? ""} placeholder="Up to" onChange={(e) => set("rate_prefix", e.target.value)} /></Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Shoppers always receive their share of the real commission Impact reports. The rate shown is for display.</p>
          </div>

          <Field label="Description" full><Textarea rows={3} value={f.description ?? ""} onChange={(e) => set("description", e.target.value || null)} /></Field>
          <Field label="Terms (one per line, blank = default terms)" full><Textarea rows={3} value={f.terms ?? ""} onChange={(e) => set("terms", e.target.value || null)} /></Field>
          <label className="flex items-center gap-3 text-sm font-medium"><Switch checked={!!f.is_active} onCheckedChange={(v) => set("is_active", v)} /> Visible on site</label>
          <label className="flex items-center gap-3 text-sm font-medium"><Switch checked={!!f.is_featured} onCheckedChange={(v) => set("is_featured", v)} /> Featured on home page</label>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {!isNew ? <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 /> Delete</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save store</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { adminHead } from "@/lib/admin-head";
import { amazonAffiliateUrl } from "@/lib/amazon";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Offer = Database["public"]["Tables"]["amazon_offers"]["Row"];
export const Route = createFileRoute("/_authenticated/admin/amazon")({ head: () => adminHead("Amazon USA offers", "Manage manually selected Amazon USA affiliate offers."), component: AdminAmazon });

function AdminAmazon() {
  const qc = useQueryClient();
  const offers = useQuery({ queryKey: ["admin", "amazon-offers"], queryFn: async () => {
    const { data, error } = await supabase.from("amazon_offers").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }});
  const [editing, setEditing] = useState<Partial<Offer> | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "amazon-offers"] }); qc.invalidateQueries({ queryKey: ["public", "amazon-offers"] }); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const link = amazonAffiliateUrl(editing.affiliate_url ?? "");
    if (!link) return void toast.error("Use a direct HTTPS SiteStripe link: amzn.to or amazon.com with your tag.");
    if (!editing.title?.trim()) return void toast.error("A title is required.");
    const image = editing.image_url?.trim() || null;
    if (image) {
      try { const url = new URL(image); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); }
      catch { return void toast.error("Use an HTTPS image URL."); }
    }
    setBusy(true);
    const payload = { title: editing.title.trim(), description: editing.description?.trim() ?? "", affiliate_url: link, image_url: image, sort_order: editing.sort_order ?? 0, is_active: editing.is_active ?? false };
    const { error } = editing.id ? await supabase.from("amazon_offers").update(payload).eq("id", editing.id) : await supabase.from("amazon_offers").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.message);
    setEditing(null); refresh(); toast.success("Amazon offer saved");
  };
  const remove = async (offer: Offer) => {
    if (!confirm(`Delete “${offer.title}”?`)) return;
    const { error } = await supabase.from("amazon_offers").delete().eq("id", offer.id);
    if (error) return void toast.error(error.message);
    refresh(); toast.success("Amazon offer deleted");
  };
  return <div>
    <AdminHeader title="Amazon USA offers" description="Manually selected affiliate offers. No API connection required."><Button onClick={() => setEditing({ is_active: false, sort_order: 0 })}><Plus /> Add Amazon offer</Button></AdminHeader>
    <p className="mb-6 max-w-2xl text-sm text-muted-foreground">Use your own descriptions and licensed images. Do not copy Amazon prices, availability or discount percentages. Paste the SiteStripe link exactly as Amazon provides it.</p>
    {offers.isLoading && <p>Loading offers…</p>}
    {offers.error && <p role="alert" className="text-destructive">Offers could not be loaded.</p>}
    {offers.data?.length === 0 && <p className="py-8 text-muted-foreground">No Amazon offers yet.</p>}
    <div className="space-y-3">{offers.data?.map((offer) => <div key={offer.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0 flex-1"><h2 className="break-words font-bold">{offer.title}</h2><p className="text-sm text-muted-foreground">{offer.is_active ? "Published" : "Hidden"}</p></div>
      <Button size="icon" variant="ghost" aria-label={`Edit ${offer.title}`} onClick={() => setEditing(offer)}><Pencil /></Button>
      <Button size="icon" variant="ghost" aria-label={`Delete ${offer.title}`} onClick={() => remove(offer)}><Trash2 /></Button>
    </div>)}</div>
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !busy) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?.id ? "Edit Amazon offer" : "Add Amazon offer"}</DialogTitle></DialogHeader>
      {editing && <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="amazon-title">Product / offer title</Label><Input id="amazon-title" required maxLength={160} value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="amazon-description">Your description</Label><Textarea id="amazon-description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="amazon-link">SiteStripe affiliate link</Label><Input id="amazon-link" type="url" required value={editing.affiliate_url ?? ""} onChange={(e) => setEditing({ ...editing, affiliate_url: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="amazon-image">Your own / licensed image URL (optional)</Label><Input id="amazon-image" type="url" value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="amazon-order">Sort order</Label><Input id="amazon-order" type="number" step={1} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} /></div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={editing.is_active ?? false} onCheckedChange={(value) => setEditing({ ...editing, is_active: value })} /> Publish on site</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Amazon offer"}</Button></div>
      </form>}
    </DialogContent></Dialog>
  </div>;
}
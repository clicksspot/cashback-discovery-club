import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { settingsQuery } from "@/lib/public.functions";
import { formatMoney } from "@/lib/cashback";

export const Route = createFileRoute("/_authenticated/claims")({
  head: () => ({
    meta: [
      { title: "Missing cashback claims" },
      { name: "description", content: "Tell us about a purchase that didn't earn cashback." },
      { property: "og:title", content: "Missing cashback claims" },
      { property: "og:description", content: "Tell us about a purchase that didn't earn cashback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClaimsPage,
});

function ClaimsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const [storeId, setStoreId] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const visited = useQuery({
    queryKey: ["my-clicked-stores", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("clicks").select("store_id, stores(id, name)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const r of data ?? []) if (r.stores) map.set(r.stores.id, r.stores.name);
      return [...map.entries()];
    },
  });
  const claims = useQuery({
    queryKey: ["my-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("id, order_ref, order_date, order_amount, status, admin_note, created_at, stores(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!storeId) { toast.error("Choose the store you shopped at"); return; }
    if (!orderRef.trim() || orderRef.length > 100) { toast.error("Enter your order number"); return; }
    if (!(amt > 0)) { toast.error("Enter the order amount"); return; }
    setBusy(true);
    const { error } = await supabase.from("claims").insert({
      user_id: user!.id,
      store_id: storeId,
      order_ref: orderRef.trim(),
      order_date: orderDate,
      order_amount: amt,
      details: details.trim().slice(0, 2000) || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim sent — we'll look into it");
    setOrderRef(""); setAmount(""); setDetails(""); setOrderDate(""); setStoreId("");
    qc.invalidateQueries({ queryKey: ["my-claims"] });
  };

  return (
    <SiteShell>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1fr]">
        <div>
          <h1 className="text-4xl font-extrabold">Missing cashback</h1>
          <p className="mt-2 text-muted-foreground">Bought something and it hasn't shown up after 7 days? Send us the details and we'll chase the store.</p>
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="space-y-1.5">
              <Label>Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger><SelectValue placeholder={visited.data?.length ? "Choose a store you visited" : "Visit a store through us first"} /></SelectTrigger>
                <SelectContent>
                  {(visited.data ?? []).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="ref">Order number</Label><Input id="ref" value={orderRef} maxLength={100} onChange={(e) => setOrderRef(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label htmlFor="date">Order date</Label><Input id="date" type="date" value={orderDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setOrderDate(e.target.value)} required /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="amt">Order amount ({settings.currency})</Label><Input id="amt" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="det">Anything else? (optional)</Label><Textarea id="det" rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Send claim</Button>
          </form>
        </div>
        <div>
          <h2 className="text-xl font-bold">Your claims</h2>
          {claims.data?.length ? (
            <div className="mt-3 space-y-3">
              {claims.data.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{c.stores?.name ?? "Store"} · #{c.order_ref}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{format(new Date(c.order_date), "d MMM yyyy")} · {formatMoney(c.order_amount, settings.currency)}</p>
                  {c.admin_note && <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm">{c.admin_note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No claims yet.</p>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

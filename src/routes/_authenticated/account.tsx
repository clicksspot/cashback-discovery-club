import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Clock, LogOut, Wallet, CheckCircle2, ArrowDownToLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsQuery } from "@/lib/public.functions";
import { formatMoney } from "@/lib/cashback";
import { PAYOUT_METHODS, payoutLabel, type PayoutMethodId } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My cashback" },
      { name: "description", content: "Your cashback balance, purchases and withdrawals." },
      { property: "og:title", content: "My cashback" },
      { property: "og:description", content: "Your cashback balance, purchases and withdrawals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const cur = settings.currency;

  const balance = useQuery({
    queryKey: ["my-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_balance");
      if (error) throw error;
      return data?.[0] ?? { pending: 0, approved: 0, withdrawn: 0, available: 0 };
    },
  });
  const tx = useQuery({
    queryKey: ["my-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, store_name, order_amount, cashback_amount, status, event_date, stores(name, slug)")
        .order("event_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const withdrawals = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const clicks = useQuery({
    queryKey: ["my-clicks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clicks")
        .select("id, created_at, stores(name, slug)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const b = balance.data;
  const cards = [
    { label: "Available to withdraw", value: b?.available, icon: Wallet, accent: true },
    { label: "Pending", value: b?.pending, icon: Clock },
    { label: "Confirmed total", value: b?.approved, icon: CheckCircle2 },
    { label: "Withdrawn", value: b?.withdrawn, icon: ArrowDownToLine },
  ];

  return (
    <SiteShell>
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">My cashback</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut /> Sign out
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className={`rounded-2xl p-5 shadow-card ${c.accent ? "bg-hero text-forest-foreground" : "border border-border bg-card"}`}>
              <c.icon className={`h-5 w-5 ${c.accent ? "text-lime" : "text-primary"}`} />
              <p className={`mt-3 text-sm ${c.accent ? "text-forest-foreground/70" : "text-muted-foreground"}`}>{c.label}</p>
              <p className="mt-1 font-display text-3xl font-extrabold">{formatMoney(c.value ?? 0, cur)}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="cashback" className="mt-10">
          <TabsList>
            <TabsTrigger value="cashback">Cashback</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="withdrawals">Payouts</TabsTrigger>
            <TabsTrigger value="clicks">Store visits</TabsTrigger>
          </TabsList>

          <TabsContent value="cashback" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {tx.data && tx.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Date</th><th className="p-3">Store</th><th className="p-3 text-right">Order</th><th className="p-3 text-right">Cashback</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {tx.data.map((t) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="p-3">{format(new Date(t.event_date), "MMM d, yyyy")}</td>
                        <td className="p-3 font-medium">{t.stores?.name ?? t.store_name ?? "—"}</td>
                        <td className="p-3 text-right">{formatMoney(t.order_amount, cur)}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(t.cashback_amount, cur)}</td>
                        <td className="p-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  No cashback yet. <Link to="/stores" search={{}} className="font-semibold text-primary">Find a store</Link> and start earning.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4">
            <WithdrawForm available={Number(b?.available ?? 0)} />
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {withdrawals.data && withdrawals.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3">Requested</th><th className="p-3">Method</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Note</th></tr>
                  </thead>
                  <tbody>
                    {withdrawals.data.map((w) => (
                      <tr key={w.id} className="border-t border-border">
                        <td className="p-3">{format(new Date(w.created_at), "MMM d, yyyy")}</td>
                        <td className="p-3">{payoutLabel(w.method)}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(w.amount, cur)}</td>
                        <td className="p-3"><StatusBadge status={w.status} /></td>
                        <td className="p-3 text-muted-foreground">{w.admin_note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-muted-foreground">No payouts requested yet.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clicks" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {clicks.data && clicks.data.length > 0 ? (
                <ul>
                  {clicks.data.map((c) => (
                    <li key={c.id} className="flex items-center justify-between border-t border-border p-3 text-sm first:border-t-0">
                      <span className="font-medium">{c.stores?.name ?? "Store"}</span>
                      <span className="text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy · h:mm a")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-10 text-center text-muted-foreground">You haven't visited any stores yet.</div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Purchases usually appear in your cashback list within 1–3 days of your visit.</p>
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}

const DETAIL_FIELDS: Record<PayoutMethodId, { key: string; label: string; type?: string }[]> = {
  paypal: [{ key: "paypal_email", label: "PayPal email", type: "email" }],
  bank: [
    { key: "account_name", label: "Account holder name" },
    { key: "bank_name", label: "Bank name" },
    { key: "account_number", label: "Account number / IBAN" },
    { key: "swift", label: "SWIFT / routing code (optional)" },
  ],
  jazzcash: [
    { key: "account_name", label: "Account name" },
    { key: "mobile", label: "JazzCash mobile number" },
  ],
  easypaisa: [
    { key: "account_name", label: "Account name" },
    { key: "mobile", label: "Easypaisa mobile number" },
  ],
};

function WithdrawForm({ available }: { available: number }) {
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const queryClient = useQueryClient();
  const enabled = PAYOUT_METHODS.filter((m) => settings[m.settingKey]);
  const [method, setMethod] = useState<PayoutMethodId | "">(enabled[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const min = settings.min_withdrawal;

  if (enabled.length === 0) {
    return <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">Payouts are paused right now. Please check back later.</div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return;
    const required = DETAIL_FIELDS[method].filter((f) => !f.label.includes("optional"));
    if (required.some((f) => !details[f.key]?.trim())) return void toast.error("Please fill in your payout details");
    setBusy(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      _amount: Number(amount),
      _method: method,
      _details: details,
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Withdrawal requested! We'll process it soon.");
    setAmount("");
    queryClient.invalidateQueries({ queryKey: ["my-balance"] });
    queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-border bg-card p-7 shadow-card">
      <div>
        <p className="text-sm text-muted-foreground">Available</p>
        <p className="font-display text-3xl font-extrabold">{formatMoney(available, settings.currency)}</p>
        <p className="mt-1 text-xs text-muted-foreground">Minimum withdrawal: {formatMoney(min, settings.currency)}</p>
      </div>
      <div className="space-y-1.5">
        <Label>Payout method</Label>
        <Select value={method} onValueChange={(v) => { setMethod(v as PayoutMethodId); setDetails({}); }}>
          <SelectTrigger><SelectValue placeholder="Choose method" /></SelectTrigger>
          <SelectContent>
            {enabled.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {method && DETAIL_FIELDS[method].map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input id={f.key} type={f.type ?? "text"} value={details[f.key] ?? ""} onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount ({settings.currency})</Label>
        <Input id="amount" type="number" step="0.01" min={min} max={available} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <Button type="submit" size="lg" disabled={busy || available < min}>
        {available < min ? `Reach ${formatMoney(min, settings.currency)} to withdraw` : "Request withdrawal"}
      </Button>
    </form>
  );
}

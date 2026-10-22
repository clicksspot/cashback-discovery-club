import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { settingsQuery } from "@/lib/public.functions";
import { PAYOUT_METHODS, type Settings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, full }: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function AdminSettings() {
  const qc = useQueryClient();
  const { data: saved } = useSuspenseQuery(settingsQuery);
  const [f, setF] = useState<Settings>(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(saved), [saved]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const save = async () => {
    if (f.default_cashback_percent < 0 || f.default_cashback_percent > 100) return void toast.error("Shopper share must be between 0 and 100%");
    if (f.min_withdrawal < 0) return void toast.error("Minimum withdrawal can't be negative");
    setBusy(true);
    const rows = (Object.keys(f) as (keyof Settings)[]).map((key) => ({
      key,
      value: f[key] as Json,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["public"] });
  };

  return (
    <div className="max-w-4xl">
      <AdminHeader title="Settings" description="Control how your whole site looks and works.">
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save settings</Button>
      </AdminHeader>

      <div className="space-y-6">
        <Section title="Site & home page">
          <Field label="Site name"><Input value={f.site_name} onChange={(e) => set("site_name", e.target.value)} /></Field>
          <Field label="Support email"><Input type="email" value={f.support_email} onChange={(e) => set("support_email", e.target.value)} /></Field>
          <Field label="Tagline" full><Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Home page headline" full><Input value={f.hero_title} onChange={(e) => set("hero_title", e.target.value)} /></Field>
          <Field label="Home page sub-headline" full><Textarea rows={2} value={f.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} /></Field>
          <Field label="Announcement bar" hint="Shown at the very top of every page. Leave blank to hide." full>
            <Input value={f.announcement} onChange={(e) => set("announcement", e.target.value)} />
          </Field>
        </Section>

        <Section title="Cashback" description="How much of each commission goes back to your members.">
          <Field label="Default shopper share (%)" hint="Example: 50 means a $10 commission gives the member $5. You can override this per store.">
            <Input type="number" min={0} max={100} step="0.01" value={f.default_cashback_percent} onChange={(e) => set("default_cashback_percent", num(e.target.value))} />
          </Field>
          <Field label="Currency" hint="3-letter code, e.g. USD">
            <Input value={f.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
          </Field>
        </Section>

        <Section title="Withdrawals">
          <Field label="Minimum withdrawal amount">
            <Input type="number" min={0} step="0.01" value={f.min_withdrawal} onChange={(e) => set("min_withdrawal", num(e.target.value))} />
          </Field>
          <div className="hidden sm:block" />
          {PAYOUT_METHODS.map((m) => (
            <Toggle key={m.id} label={m.label} hint="Let members withdraw with this method" checked={f[m.settingKey]} onChange={(v) => set(m.settingKey, v)} />
          ))}
        </Section>

        <Section title="Impact import">
          <Toggle label="Automatic sync" hint="Import stores, deals, coupons and sales from Impact every 6 hours" checked={f.auto_sync_enabled} onChange={(v) => set("auto_sync_enabled", v)} />
          <Toggle label="Show new stores straight away" hint="If off, newly imported stores stay hidden until you switch them on" checked={f.auto_publish_new_stores} onChange={(v) => set("auto_publish_new_stores", v)} />
          <Toggle label="Show new deals & coupons straight away" hint="If off, newly imported offers stay hidden until you switch them on" checked={f.auto_publish_new_offers} onChange={(v) => set("auto_publish_new_offers", v)} />
          <Toggle label="Show deals & coupons on the site" hint="Turn off to hide the Deals page, home page deals and store coupons" checked={f.show_deals} onChange={(v) => set("show_deals", v)} />
          <Field label="Check sales from the last (days)" hint="Between 1 and 180. Longer catches late approvals but takes more time.">
            <Input type="number" min={1} max={180} value={f.actions_lookback_days} onChange={(e) => set("actions_lookback_days", num(e.target.value))} />
          </Field>
        </Section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save settings</Button>
      </div>
    </div>
  );
}

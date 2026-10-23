import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, Loader2, RefreshCw, Store, Receipt, Tag, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { getImpactStatus, runSyncNow } from "@/lib/admin.functions";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/sync")({
  head: () => ({ meta: [
    { title: "Impact Sync · CashLeaf Admin" },
    { name: "description", content: "Import Impact stores, rates, deals and sales into CashLeaf." },
    { property: "og:title", content: "Impact Sync · CashLeaf Admin" },
    { property: "og:description", content: "Import Impact stores, rates, deals and sales into CashLeaf." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AdminSync,
});

type Kind = "all" | "stores" | "actions" | "offers";

const STAT_LABELS: Record<string, string> = {
  campaigns_found: "Programs found",
  approved: "Approved programs",
  new_stores: "New stores added",
  updated_stores: "Stores updated",
  hidden_stores: "Stores hidden (no longer approved)",
  rates_found: "Commission rates found",
  rates_warning: "Rate warning",
  sales_found: "Sales found",
  saved: "Sales saved",
  matched_to_members: "Linked to members",
  unmatched: "Not linked to a member",
  skipped_locked: "Skipped (edited by you)",
  days: "Days checked",
  offers_found: "Offers found",
  new_offers: "New offers added",
  updated_offers: "Offers updated",
  hidden_offers: "Offers hidden (expired or removed)",
  expired_skipped: "Already expired (skipped)",
  no_store: "Skipped (store not imported)",
  promo_warning: "Promo code warning",
};

function StatsView({ stats }: { stats: unknown }) {
  if (!stats || typeof stats !== "object") return null;
  const groups = Object.entries(stats as Record<string, Record<string, unknown>>);
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      {groups.map(([group, values]) => (
        <div key={group} className="rounded-lg bg-secondary/60 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{group === "stores" ? "Stores" : group === "offers" ? "Deals & coupons" : "Sales"}</p>
          {values && typeof values === "object" &&
            Object.entries(values).map(([k, v]) => (
              <p key={k} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{STAT_LABELS[k] ?? k}</span>
                <span className="text-right font-semibold">{String(v)}</span>
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}

function AdminSync() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const statusFn = useServerFn(getImpactStatus);
  const syncFn = useServerFn(runSyncNow);
  const [running, setRunning] = useState<Kind | null>(null);

  const status = useQuery({ queryKey: ["admin", "impact-status"], queryFn: () => statusFn() });
  const logs = useQuery({
    queryKey: ["admin", "sync-logs"],
    queryFn: async () => (await supabase.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(30)).data ?? [],
  });

  const run = async (kind: Kind) => {
    setRunning(kind);
    try {
      const res = await syncFn({ data: { kind } });
      if (res.skipped) toast.message("Sync skipped");
      else toast.success("Sync finished");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setRunning(null);
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["public"] });
    }
  };

  const configured = status.data?.configured;

  return (
    <div>
      <AdminHeader title="Impact sync" description="Import your approved stores, commission rates, deals, coupons and sales from Impact." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Impact connection</p>
          {status.isLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />
          ) : status.isError ? (
            <p className="mt-2 text-sm text-destructive">Connection status unavailable. Please try again.</p>
          ) : configured ? (
            <p className="mt-2 flex items-center gap-2 font-semibold text-primary"><CheckCircle2 className="h-5 w-5" /> Connected</p>
          ) : (
            <div className="mt-2">
              <p className="flex items-center gap-2 font-semibold text-destructive"><XCircle className="h-5 w-5" /> Not connected</p>
              <p className="mt-1 text-xs text-muted-foreground">Add your Impact Account SID and Auth Token in Settings.</p>
              <Button asChild variant="link" className="h-auto px-0"><Link to="/admin/settings">Add credentials</Link></Button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Automatic sync</p>
          <p className="mt-2 font-semibold">{settings.auto_sync_enabled ? "On — every 6 hours" : "Off"}</p>
          <Link to="/admin/settings" className="text-xs font-semibold text-primary">Change in Settings</Link>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm text-muted-foreground">New stores</p>
          <p className="mt-2 font-semibold">{settings.auto_publish_new_stores ? "Shown on site straight away" : "Hidden until you approve them"}</p>
          <p className="text-xs text-muted-foreground">Sales checked for the last {settings.actions_lookback_days} days</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" disabled={!configured || !!running} onClick={() => run("all")}>
          {running === "all" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync everything now
        </Button>
        <Button size="lg" variant="outline" disabled={!configured || !!running} onClick={() => run("stores")}>
          {running === "stores" ? <Loader2 className="animate-spin" /> : <Store />} Stores & rates only
        </Button>
        <Button size="lg" variant="outline" disabled={!configured || !!running} onClick={() => run("offers")}>
          {running === "offers" ? <Loader2 className="animate-spin" /> : <Tag />} Deals & coupons only
        </Button>
        <Button size="lg" variant="outline" disabled={!configured || !!running} onClick={() => run("actions")}>
          {running === "actions" ? <Loader2 className="animate-spin" /> : <Receipt />} Sales only
        </Button>
      </div>
      {running && <p className="mt-2 text-sm text-muted-foreground">This can take up to a minute with hundreds of stores…</p>}

      <h2 className="mt-10 text-xl font-bold">Sync history</h2>
      <div className="mt-3 space-y-3">
        {logs.data?.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">No syncs yet.</div>}
        {logs.data?.map((l) => (
          <div key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusBadge status={l.status} />
              <span className="font-semibold capitalize">{l.kind === "actions" ? "Sales" : l.kind === "all" ? "Everything" : l.kind === "offers" ? "Deals & coupons" : "Stores"}</span>
              <span className="text-muted-foreground">{l.trigger === "cron" ? "automatic" : "manual"}</span>
              <span className="ml-auto text-muted-foreground">{format(new Date(l.started_at), "MMM d, yyyy · h:mm a")}</span>
            </div>
            {l.status === "error" && l.message && <p className="mt-2 break-words text-sm text-destructive">{l.message}</p>}
            <StatsView stats={l.stats} />
          </div>
        ))}
      </div>
    </div>
  );
}

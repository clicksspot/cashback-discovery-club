import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getImpactStatus, updateImpactCredentials } from "@/lib/admin.functions";

export function ImpactCredentials() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getImpactStatus);
  const updateFn = useServerFn(updateImpactCredentials);
  const status = useQuery({ queryKey: ["admin", "impact-status"], queryFn: () => statusFn() });
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    // Clear inputs before the network request; saved secrets are never fetched back.
    const data = { sid: sid.trim(), token: token.trim() };
    setSid("");
    setToken("");
    try {
      await updateFn({ data });
      toast.success("Impact credentials verified and saved");
      await qc.invalidateQueries({ queryKey: ["admin", "impact-status"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credentials could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-border pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-primary" /> Impact credentials</h2>
        {status.isPending ? <Loader2 aria-label="Checking Impact connection" className="h-4 w-4 animate-spin" /> : status.isError ?
          <p className="text-sm text-destructive">Connection status unavailable</p> :
          <p className={`flex items-center gap-2 text-sm font-semibold ${status.data?.configured ? "text-primary" : "text-muted-foreground"}`}>
            {status.data?.configured && <CheckCircle2 className="h-4 w-4" />}{status.data?.configured ? "Credentials saved" : "Not connected"}
          </p>}
      </div>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="impact-sid">Impact Account SID</Label>
            <Input id="impact-sid" type="password" autoComplete="off" required maxLength={128} value={sid} onChange={(e) => setSid(e.target.value)} disabled={busy} placeholder="Enter Account SID" />
          </div>
          <div className="space-y-1.5"><Label htmlFor="impact-token">Impact Auth Token</Label>
            <Input id="impact-token" type="password" autoComplete="new-password" required maxLength={1024} value={token} onChange={(e) => setToken(e.target.value)} disabled={busy} placeholder="Enter Auth Token" />
          </div>
        </div>
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /> Encrypted and private. Saved values are never displayed.</p>
          <Button type="submit" disabled={busy || !sid.trim() || !token.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {busy ? "Verifying…" : status.data?.configured ? "Verify & replace credentials" : "Verify & save credentials"}
          </Button>
        </div>
      </form>
    </section>
  );
}
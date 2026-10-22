import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/SiteShell";
import { useSuspenseQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/public.functions";
import { normalizeRefCode, peekRememberedRef, rememberRef, takeRememberedRef } from "@/lib/referral";

type AuthSearch = { mode?: "signin" | "signup" | undefined; redirect?: string | undefined; ref?: string | undefined };

function safeRedirect(r?: string) {
  return r && r.startsWith("/") && !r.startsWith("//") ? r : "/account";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    mode: s["mode"] === "signup" ? "signup" : undefined,
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    ref: normalizeRefCode(s["ref"]) ?? undefined,
  }),
  loader: async ({ context }) => {
    const settings = await context.queryClient.ensureQueryData(settingsQuery);
    return { siteName: settings.site_name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.siteName ?? "CashLeaf";
    return {
      meta: [
        { title: `Sign in or join | ${name}` },
        { name: "description", content: `Sign in to ${name} to track and withdraw your cashback.` },
        { property: "og:title", content: `Sign in or join | ${name}` },
        { property: "og:description", content: `Create a free ${name} account and start earning cash back.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const target = safeRedirect(search.redirect);

  useEffect(() => {
    if (search.ref) rememberRef(search.ref);
  }, [search.ref]);

  useEffect(() => {
    if (loading || !user) return;
    const ref = takeRememberedRef();
    void (async () => {
      if (ref) await supabase.rpc("claim_referral", { _code: ref });
      router.history.push(target);
    })();
  }, [loading, user, target, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + target, data: { full_name: name, ref: peekRememberedRef() ?? search.ref ?? "" } },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your inbox and click the link to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("We've emailed you a link to reset your password.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const qs = search.redirect ? `?redirect=${encodeURIComponent(target)}` : "";
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth${qs}`,
    });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-12 text-forest-foreground lg:flex">
        <Link to="/"><Logo name={settings.site_name} light /></Link>
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Every purchase.<br />A little cash back.</h1>
          <p className="mt-4 max-w-md text-forest-foreground/75">{settings.tagline}</p>
        </div>
        <p className="text-sm text-forest-foreground/60">Free forever. No credit card needed.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 block lg:hidden"><Logo name={settings.site_name} /></Link>
          {sent ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <p className="mt-4 font-semibold">{sent}</p>
              <Button variant="link" onClick={() => { setSent(null); setMode("signin"); }}>Back to sign in</Button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold">
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your free account" : "Reset password"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to see your cashback." : mode === "signup" ? "Start earning on your next order." : "We'll email you a reset link."}
              </p>
              {mode === "signup" && search.ref && (
                <p className="mt-3 rounded-lg bg-lime px-3 py-2 text-sm font-semibold text-lime-foreground">A friend invited you — welcome!</p>
              )}
              {mode !== "forgot" && (
                <>
                  <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.28 12 6.28c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.72 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.98 0-.6-.07-1.06-.15-1.52z" /></svg>
                    Continue with Google
                  </Button>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}
              <form onSubmit={submit} className={`space-y-4 ${mode === "forgot" ? "mt-6" : ""}`}>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setMode("forgot")}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>Already have an account? <button className="font-semibold text-primary" onClick={() => setMode("signin")}>Sign in</button></>
                ) : (
                  <>New here? <button className="font-semibold text-primary" onClick={() => setMode("signup")}>Create a free account</button></>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

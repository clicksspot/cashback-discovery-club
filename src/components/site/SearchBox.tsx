import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { settingsQuery, storesQuery } from "@/lib/public.functions";
import { formatRate } from "@/lib/cashback";
import { cn } from "@/lib/utils";

export function SearchBox({ className, onDone }: { className?: string; onDone?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: stores } = useQuery({ ...storesQuery, enabled: focused || q.length > 0 });
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !stores) return [];
    const starts = stores.filter((s) => s.name.toLowerCase().startsWith(term));
    const contains = stores.filter((s) => !s.name.toLowerCase().startsWith(term) && s.name.toLowerCase().includes(term));
    return [...starts, ...contains].slice(0, 7);
  }, [q, stores]);

  const goStore = (slug: string) => {
    navigate({ to: "/stores/$slug", params: { slug } });
    setQ("");
    setFocused(false);
    onDone?.();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pick = matches[active];
    if (pick && q.trim()) return goStore(pick.slug);
    navigate({ to: "/stores", search: { q: q.trim() || undefined } });
    setFocused(false);
    onDone?.();
  };

  const open = focused && q.trim().length > 0;

  return (
    <form onSubmit={submit} className={cn("relative", className)} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setFocused(true); }}
        onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 150); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Escape") setFocused(false);
        }}
        placeholder="Search 500+ stores…"
        aria-label="Search stores"
        className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-lift">
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{stores ? "No stores found" : "Searching…"}</p>
          ) : (
            <ul>
              {matches.map((s, i) => {
                const rate = formatRate(s, settings.default_cashback_percent, settings.currency);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goStore(s.slug)}
                      onMouseEnter={() => setActive(i)}
                      className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", i === active && "bg-secondary")}
                    >
                      <StoreLogo name={s.name} src={s.logo_url} className="h-8 w-12 shrink-0" />
                      <span className="flex-1 truncate text-sm font-semibold">{s.name}</span>
                      {rate && <span className="shrink-0 text-xs font-bold text-primary">{rate}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="submit" className="block w-full border-t border-border px-4 py-2 text-left text-xs font-semibold text-primary hover:bg-secondary">
            See all results for “{q.trim()}”
          </button>
        </div>
      )}
    </form>
  );
}

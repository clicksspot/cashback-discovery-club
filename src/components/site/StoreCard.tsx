import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { StoreLogo } from "./StoreLogo";
import { FavoriteButton } from "./FavoriteButton";
import { displayRate, formatRate } from "@/lib/cashback";
import { isBoosted } from "@/lib/referral";
import type { PublicStore } from "@/lib/public.functions";
import type { Settings } from "@/lib/settings";

export function previousRateLabel(store: PublicStore, settings: Settings): string | null {
  const current = displayRate(store, settings.default_cashback_percent);
  if (!isBoosted(store.previous_rate, current)) return null;
  return formatRate({ ...store, display_rate_override: store.previous_rate }, settings.default_cashback_percent, settings.currency);
}

export function StoreCard({ store, settings }: { store: PublicStore; settings: Settings }) {
  const rate = formatRate(store, settings.default_cashback_percent, settings.currency);
  const was = previousRateLabel(store, settings);
  return (
    <Link
      to="/stores/$slug"
      params={{ slug: store.slug }}
      className="group relative flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <FavoriteButton storeId={store.id} className="absolute right-3 top-3 border-transparent bg-transparent" />
      {was && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-forest-foreground">
          <TrendingUp className="h-3 w-3" /> Boosted
        </span>
      )}
      <StoreLogo name={store.name} src={store.logo_url} className="mt-4 h-16 w-full" />
      <h3 className="mt-4 line-clamp-1 text-base font-bold">{store.name}</h3>
      <div className="mt-3 rounded-full bg-lime px-3 py-1 text-sm font-bold text-lime-foreground">
        {rate ? `${store.rate_prefix ? store.rate_prefix + " " : ""}${rate} cashback` : "Cashback available"}
      </div>
      {was && <p className="mt-1.5 text-xs text-muted-foreground line-through">was {was}</p>}
    </Link>
  );
}

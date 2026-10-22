import { Link } from "@tanstack/react-router";
import { StoreLogo } from "./StoreLogo";
import { formatRate } from "@/lib/cashback";
import type { PublicStore } from "@/lib/public.functions";
import type { Settings } from "@/lib/settings";

export function StoreCard({ store, settings }: { store: PublicStore; settings: Settings }) {
  const rate = formatRate(store, settings.default_cashback_percent, settings.currency);
  return (
    <Link
      to="/stores/$slug"
      params={{ slug: store.slug }}
      className="group flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <StoreLogo name={store.name} src={store.logo_url} className="h-16 w-full" />
      <h3 className="mt-4 line-clamp-1 text-base font-bold">{store.name}</h3>
      <div className="mt-3 rounded-full bg-lime px-3 py-1 text-sm font-bold text-lime-foreground">
        {rate ? `${store.rate_prefix ? store.rate_prefix + " " : ""}${rate} cashback` : "Cashback available"}
      </div>
    </Link>
  );
}

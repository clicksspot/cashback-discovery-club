import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Check, Copy, Crown, ExternalLink, Scissors, Tag } from "lucide-react";
import { toast } from "sonner";
import { StoreLogo } from "./StoreLogo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { concealCouponCode, discountLabel } from "@/lib/offers";
import { formatRate } from "@/lib/cashback";
import type { PublicOffer } from "@/lib/public.functions";
import type { Settings } from "@/lib/settings";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function OfferCard({ offer, settings, showStore = true }: { offer: PublicOffer; settings: Settings; showStore?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const label = discountLabel(offer);
  const cashback = formatRate(offer.stores, settings.default_cashback_percent, settings.currency);
  const goSearch = { offer: offer.id };
  const isCode = !!offer.code;
  const title = concealCouponCode(offer.title, offer.code);
  const description = concealCouponCode(offer.description ?? "", offer.code);

  const reveal = async () => {
    setOpen(true);
    if (offer.code && (await copyText(offer.code))) setCopied(true);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-lift sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-center gap-4 sm:w-40 sm:shrink-0 sm:flex-col sm:items-center sm:text-center">
        {showStore && <StoreLogo name={offer.stores.name} src={offer.stores.logo_url} className="h-12 w-20 shrink-0" />}
        <div className={`rounded-xl px-3 py-2 font-display text-lg font-extrabold leading-tight ${label ? "bg-lime text-lime-foreground" : "bg-secondary text-foreground"}`}>
          {label ?? (isCode ? "Code" : "Deal")}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {showStore && (
            <Link to="/stores/$slug" params={{ slug: offer.stores.slug }} className="text-primary hover:underline">
              {offer.stores.name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {isCode ? <Tag className="h-3 w-3" /> : <Scissors className="h-3 w-3" />} {isCode ? "Coupon code" : "Deal"}
          </span>
          {offer.is_exclusive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-forest-foreground">
              <Crown className="h-3 w-3" /> Exclusive
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug">{title}</h3>
        {description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {cashback && <span className="font-semibold text-primary">+ {offer.stores.rate_prefix ? `${offer.stores.rate_prefix.toLowerCase()} ` : ""}{cashback} cashback</span>}
          {offer.ends_at && <span>Ends {format(new Date(offer.ends_at), "MMM d, yyyy")}</span>}
        </p>
      </div>

      <div className="sm:w-44 sm:shrink-0">
        {isCode ? (
          <Button
            variant="outline"
            onClick={reveal}
            className="group relative flex h-11 w-full items-center overflow-hidden rounded-xl border-2 border-dashed border-primary bg-secondary font-mono text-sm font-bold"
          >
            <span className="flex-1 pl-14 text-right tracking-widest">{offer.code?.slice(-3)}</span>
            <span className="absolute inset-y-0 left-0 flex w-[78%] items-center justify-center rounded-r-lg bg-primary font-sans text-primary-foreground transition-all group-hover:w-[72%]">
              Show code
            </span>
          </Button>
        ) : (
          <Button asChild className="h-11 w-full">
            <Link to="/go/$slug" params={{ slug: offer.stores.slug }} search={goSearch} target="_blank" rel="nofollow">
              Get deal <ExternalLink />
            </Link>
          </Button>
        )}
      </div>

      {isCode && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="items-center text-center">
              <StoreLogo name={offer.stores.name} src={offer.stores.logo_url} className="h-14 w-24" />
              <DialogTitle className="pt-2 text-center">{title}</DialogTitle>
              <DialogDescription className="text-center">
                Copy this code, then paste it at checkout on {offer.stores.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary bg-secondary p-2">
              <span className="flex-1 select-all text-center font-mono text-xl font-extrabold tracking-widest">{offer.code}</span>
              <Button
                size="sm"
                variant={copied ? "forest" : "default"}
                onClick={async () => {
                  if (offer.code && await copyText(offer.code)) {
                    setCopied(true);
                    toast.success("Code copied");
                  } else toast.message("Select the code and copy it");
                }}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/go/$slug" params={{ slug: offer.stores.slug }} search={goSearch} target="_blank" rel="nofollow">
                Go to {offer.stores.name} {cashback ? `& earn ${cashback} back` : ""} <ExternalLink />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Stay signed in so your cashback is tracked on this order.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

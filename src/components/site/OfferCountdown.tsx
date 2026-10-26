import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { getOfferCountdown, type OfferCountdown as CountdownValue } from "@/lib/offer-countdown";

export function useOfferCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt || !Number.isFinite(Date.parse(endsAt))) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endsAt]);
  return now === null ? null : getOfferCountdown(endsAt, now);
}

export function OfferCountdown({ value, endsAt }: { value: CountdownValue; endsAt: string }) {
  if (value.expired) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Timer className="h-3.5 w-3.5" /> Offer ended</span>;
  const units = [
    { amount: value.days, label: "days" },
    { amount: value.hours, label: "hrs" },
    { amount: value.minutes, label: "min" },
    { amount: value.seconds, label: "sec" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2" title={`Ends ${new Date(endsAt).toLocaleString()}`}>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${value.endingSoon ? "text-warning-foreground" : "text-muted-foreground"}`}>
        <Timer className="h-3.5 w-3.5" /> {value.endingSoon ? "Ending soon" : "Ends in"}
      </span>
      <div className="flex gap-1" role="timer" aria-label={`${value.days} days, ${value.hours} hours, ${value.minutes} minutes, ${value.seconds} seconds remaining`} aria-live="off">
        {units.map(({ amount, label }) => (
          <span key={label} className={`flex min-w-9 flex-col items-center rounded-md px-1.5 py-1 ${value.endingSoon ? "bg-warning/15 text-warning-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <span className="font-mono text-sm font-bold leading-4 tabular-nums">{String(amount).padStart(2, "0")}</span>
            <span className="text-[9px] font-medium leading-3">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
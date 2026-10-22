import { useState } from "react";
import { cn } from "@/lib/utils";

export function StoreLogo({ name, src, className }: { name: string; src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-2", className)}>
      {src && !failed ? (
        <img src={src} alt={`${name} logo`} loading="lazy" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="font-display text-lg font-bold text-forest">{initials}</span>
      )}
    </div>
  );
}

import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ storeId, className, withLabel = false }: { storeId: string; className?: string; withLabel?: boolean }) {
  const { ids, signedIn, toggle, busy } = useFavorites();
  const navigate = useNavigate();
  const active = ids.has(storeId);
  return (
    <button
      type="button"
      aria-label={active ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={active}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          void navigate({ to: "/auth", search: { redirect: window.location.pathname } });
          return;
        }
        toggle(storeId);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-2 text-sm font-semibold transition-colors hover:border-primary",
        active ? "text-destructive" : "text-muted-foreground",
        withLabel && "px-4",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
      {withLabel && (active ? "Saved" : "Save store")}
    </button>
  );
}

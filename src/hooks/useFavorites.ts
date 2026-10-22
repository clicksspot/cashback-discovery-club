import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["favorites", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("store_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.store_id));
    },
  });
  const toggle = useMutation({
    mutationFn: async (storeId: string) => {
      if (!user) throw new Error("Sign in to save favourite stores");
      if (query.data?.has(storeId)) {
        const { error } = await supabase.from("favorites").delete().eq("store_id", storeId).eq("user_id", user.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("favorites").insert({ store_id: storeId, user_id: user.id });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      toast.success(added ? "Saved to your favourites" : "Removed from favourites");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update favourites"),
  });
  return { ids: query.data ?? new Set<string>(), signedIn: !!user, toggle: toggle.mutate, busy: toggle.isPending };
}

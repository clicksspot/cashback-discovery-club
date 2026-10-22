import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/cashback";
import { settingsQuery } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const cur = settings.currency;
  const [q, setQ] = useState("");
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_list");
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = (users.data ?? []).filter((u) => !q || `${u.email} ${u.full_name}`.toLowerCase().includes(q.toLowerCase()));

  const setBlocked = async (id: string, v: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: v }).eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };
  const setAdmin = async (id: string, v: boolean) => {
    if (id === user?.id && !v) return void toast.error("You can't remove your own admin access");
    const { error } = v
      ? await supabase.from("user_roles").insert({ user_id: id, role: "admin" })
      : await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    if (error) return void toast.error(error.message);
    toast.success(v ? "Admin access granted" : "Admin access removed");
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  return (
    <div>
      <AdminHeader title="Members" description={`${users.data?.length ?? 0} people have joined.`} />
      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by email or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Member</th><th className="p-3">Joined</th><th className="p-3 text-right">Store visits</th><th className="p-3 text-right">Pending</th><th className="p-3 text-right">Available</th><th className="p-3 text-right">Withdrawn</th><th className="p-3 text-center">Blocked</th><th className="p-3 text-center">Admin</th></tr>
          </thead>
          <tbody>
            {users.isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3"><p className="font-semibold">{u.full_name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                <td className="p-3 whitespace-nowrap">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                <td className="p-3 text-right">{u.clicks}</td>
                <td className="p-3 text-right">{formatMoney(u.pending, cur)}</td>
                <td className="p-3 text-right font-semibold">{formatMoney(u.available, cur)}</td>
                <td className="p-3 text-right">{formatMoney(u.withdrawn, cur)}</td>
                <td className="p-3 text-center"><Switch checked={u.is_blocked} onCheckedChange={(v) => setBlocked(u.id, v)} /></td>
                <td className="p-3 text-center"><Switch checked={u.is_admin} onCheckedChange={(v) => setAdmin(u.id, v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Blocked members can still sign in but can't request withdrawals.</p>
    </div>
  );
}

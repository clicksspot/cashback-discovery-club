import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/site/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify } from "@/lib/cashback";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const cats = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const counts = useQuery({
    queryKey: ["admin", "category-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("category_id").not("category_id", "is", null).limit(5000);
      const m = new Map<string, number>();
      (data ?? []).forEach((r) => m.set(r.category_id!, (m.get(r.category_id!) ?? 0) + 1));
      return m;
    },
  });
  const [name, setName] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["public"] });
  };
  const update = async (id: string, values: Database["public"]["Tables"]["categories"]["Update"]) => {
    const { error } = await supabase.from("categories").update(values).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  };
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      slug: slugify(name),
      icon: "Tag",
      sort_order: (cats.data?.length ?? 0) + 1,
    });
    if (error) return void toast.error(error.message);
    setName("");
    refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this category? Stores in it will become uncategorised.")) return;
    await supabase.from("categories").delete().eq("id", id);
    refresh();
  };

  return (
    <div>
      <AdminHeader title="Categories" description="Group stores so shoppers can browse easily." />
      <div className="mb-4 flex max-w-md gap-2">
        <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus /> Add</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Icon</th><th className="p-3">Name</th><th className="p-3">Order</th><th className="p-3">Stores</th><th className="p-3 text-center">Visible</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {cats.data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3">
                  <Select value={c.icon ?? "Tag"} onValueChange={(v) => update(c.id, { icon: v })}>
                    <SelectTrigger className="w-20"><CategoryIcon name={c.icon} className="h-4 w-4" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(CATEGORY_ICONS).map((k) => (
                        <SelectItem key={k} value={k}><span className="flex items-center gap-2"><CategoryIcon name={k} className="h-4 w-4" />{k}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3"><Input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && update(c.id, { name: e.target.value })} /></td>
                <td className="p-3"><Input type="number" className="w-20" defaultValue={c.sort_order} onBlur={(e) => update(c.id, { sort_order: Number(e.target.value) || 0 })} /></td>
                <td className="p-3">{counts.data?.get(c.id) ?? 0}</td>
                <td className="p-3 text-center"><Switch checked={c.is_active} onCheckedChange={(v) => update(c.id, { is_active: v })} /></td>
                <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Tip: assign many stores at once on the Stores page by ticking them and choosing “Set category”.</p>
    </div>
  );
}

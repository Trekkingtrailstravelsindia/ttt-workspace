import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

type Pkg = {
  id: string; name: string; description: string | null; duration_days: number;
  price_per_person: number; location: string | null; season: string | null; active: boolean;
};

export const Route = createFileRoute("/_authenticated/packages")({ component: PackagesPage });

function PackagesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await supabase.from("tour_packages").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [open, setOpen] = useState(false);

  async function save(form: FormData) {
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      user_id: userData.user!.id,
      name: String(form.get("name")).trim(),
      description: (form.get("description") as string) || null,
      duration_days: Number(form.get("duration_days")) || 1,
      price_per_person: Number(form.get("price_per_person")) || 0,
      location: (form.get("location") as string) || null,
      season: (form.get("season") as string) || null,
      active: form.get("active") === "on",
    };
    if (!payload.name) return toast.error("Name required");
    const { error } = editing
      ? await supabase.from("tour_packages").update(payload).eq("id", editing.id)
      : await supabase.from("tour_packages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Package updated" : "Package added");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["packages"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("tour_packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["packages"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Tour packages</h1>
          <p className="text-muted-foreground">Your catalog of Finland experiences.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add package</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={editing?.name} placeholder="Northern Lights Rovaniemi Escape" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="duration_days">Duration (days)</Label>
                  <Input id="duration_days" name="duration_days" type="number" min={1} defaultValue={editing?.duration_days ?? 3} />
                </div>
                <div>
                  <Label htmlFor="price_per_person">Price / person (€)</Label>
                  <Input id="price_per_person" name="price_per_person" type="number" min={0} step="0.01" defaultValue={editing?.price_per_person ?? 0} />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" defaultValue={editing?.location ?? ""} placeholder="Lapland" />
                </div>
                <div>
                  <Label htmlFor="season">Season</Label>
                  <Input id="season" name="season" defaultValue={editing?.season ?? ""} placeholder="Winter" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="active">Active</Label>
                  <div className="text-xs text-muted-foreground">Available for new bookings</div>
                </div>
                <Switch id="active" name="active" defaultChecked={editing?.active ?? true} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <Card><CardContent className="py-16 text-center">
          <p className="mb-4 text-muted-foreground">No packages yet.</p>
          <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add package</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-lg font-semibold">{p.name}</div>
                      {!p.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {p.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{p.location}</span>}
                      <span className="flex items-center gap-1"><Clock className="size-3" />{p.duration_days} day{p.duration_days > 1 ? "s" : ""}</span>
                      {p.season && <span>· {p.season}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {p.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">From</span>
                  <span className="text-2xl font-semibold text-primary">€{Number(p.price_per_person).toFixed(0)}<span className="text-sm text-muted-foreground">/pp</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/departures")({ component: DeparturesPage });

function DeparturesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-basic"],
    queryFn: async () => (await supabase.from("tour_packages").select("id, name").order("name")).data ?? [],
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["departures"],
    queryFn: async () => (await supabase.from("package_departures").select("*").order("departure_date", { ascending: true })).data ?? [],
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-dep"],
    queryFn: async () => (await supabase.from("bookings").select("package_id, start_date, travelers, status").neq("status", "cancelled")).data ?? [],
  });

  const pkgById = new Map(packages.map((p: any) => [p.id, p]));
  const bookedCount = useMemo(() => {
    const m = new Map<string, number>();
    (bookings as any[]).forEach(b => {
      const k = `${b.package_id}|${b.start_date}`;
      m.set(k, (m.get(k) ?? 0) + Number(b.travelers ?? 0));
    });
    return m;
  }, [bookings]);

  async function remove(id: string) {
    if (!confirm("Delete this departure?")) return;
    const { error } = await supabase.from("package_departures").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["departures"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary flex items-center gap-2"><CalendarClock className="size-7" /> Departures</h1>
          <p className="text-sm text-muted-foreground">Fixed departure dates & seat capacity per package.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add departure</Button></DialogTrigger>
          <DepartureDialog packages={packages as any[]} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["departures"] }); }} />
        </Dialog>
      </div>

      {departures.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No departures scheduled yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(departures as any[]).map(d => {
            const pkg = pkgById.get(d.package_id) as any;
            const booked = bookedCount.get(`${d.package_id}|${d.departure_date}`) ?? 0;
            const remaining = Math.max(0, (d.capacity ?? 0) - booked);
            const soldOut = remaining <= 0 && d.capacity > 0;
            return (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{pkg?.name ?? "Package"}</div>
                      <div className="font-display text-lg text-primary">{new Date(d.departure_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant={soldOut ? "destructive" : "secondary"}>{booked}/{d.capacity} booked</Badge>
                        {!soldOut && <Badge variant="outline">{remaining} left</Badge>}
                      </div>
                      {d.notes && <div className="mt-2 text-xs text-muted-foreground">{d.notes}</div>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DepartureDialog({ packages, onSaved }: { packages: any[]; onSaved: () => void }) {
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!packageId || !date) return toast.error("Package and date required");
    setSaving(true);
    const { error } = await supabase.from("package_departures").insert({
      package_id: packageId,
      departure_date: date,
      capacity: Number(capacity) || 0,
      notes: notes.trim() || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Departure added");
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>New departure</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Package</Label>
          <Select value={packageId} onValueChange={setPackageId}>
            <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
            <SelectContent>{packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Departure date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input type="number" min={0} value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>Add departure</Button>
      </form>
    </DialogContent>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rate-cards")({ component: RateCardsPage });

const RATE_TYPES = [
  { value: "per_unit", label: "Per unit" },
  { value: "per_night", label: "Per night" },
  { value: "per_pax", label: "Per person" },
  { value: "per_trip", label: "Per trip" },
  { value: "per_hour", label: "Per hour" },
];

function RateCardsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-basic"],
    queryFn: async () => (await supabase.from("suppliers").select("id, name, category").order("name")).data ?? [],
  });

  const { data: rates = [] } = useQuery({
    queryKey: ["supplier-rates"],
    queryFn: async () => (await supabase.from("supplier_rates").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const supplierById = new Map(suppliers.map((s: any) => [s.id, s]));

  async function remove(id: string) {
    if (!confirm("Delete this rate?")) return;
    const { error } = await supabase.from("supplier_rates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["supplier-rates"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary flex items-center gap-2"><Tags className="size-7" /> Rate cards</h1>
          <p className="text-sm text-muted-foreground">Store supplier prices so cost estimation stays consistent.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add rate</Button></DialogTrigger>
          <RateDialog editing={editing} suppliers={suppliers as any[]} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["supplier-rates"] }); }} />
        </Dialog>
      </div>

      {rates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No rates yet. Add supplier rates so estimates auto-fill.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rates.map((r: any) => {
            const s = supplierById.get(r.supplier_id) as any;
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{s?.name ?? "Unknown supplier"} {s?.category ? `· ${s.category}` : ""}</div>
                      <div className="font-medium">{r.service_name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary">{RATE_TYPES.find(t => t.value === r.rate_type)?.label ?? r.rate_type}</Badge>
                        {r.season_start && <Badge variant="outline">{r.season_start} → {r.season_end}</Badge>}
                      </div>
                      {r.notes && <div className="mt-2 text-xs text-muted-foreground">{r.notes}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-primary">{r.currency} {Number(r.amount).toFixed(2)}</div>
                      <div className="mt-2 flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </div>
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

function RateDialog({ editing, suppliers, onSaved }: { editing: any | null; suppliers: any[]; onSaved: () => void }) {
  const [supplierId, setSupplierId] = useState(editing?.supplier_id ?? "");
  const [serviceName, setServiceName] = useState(editing?.service_name ?? "");
  const [rateType, setRateType] = useState(editing?.rate_type ?? "per_unit");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [currency, setCurrency] = useState(editing?.currency ?? "EUR");
  const [seasonStart, setSeasonStart] = useState(editing?.season_start ?? "");
  const [seasonEnd, setSeasonEnd] = useState(editing?.season_end ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !serviceName) return toast.error("Supplier and service required");
    setSaving(true);
    const payload = {
      supplier_id: supplierId,
      service_name: serviceName.trim(),
      rate_type: rateType,
      amount: Number(amount) || 0,
      currency,
      season_start: seasonStart || null,
      season_end: seasonEnd || null,
      notes: notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("supplier_rates").update(payload).eq("id", editing.id)
      : await supabase.from("supplier_rates").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Edit rate" : "New rate"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Supplier</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Service name</Label>
          <Input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="e.g. Glass igloo double" required maxLength={120} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Rate type</Label>
            <Select value={rateType} onValueChange={setRateType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Season starts (opt.)</Label>
            <Input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} />
          </div>
          <div>
            <Label>Season ends (opt.)</Label>
            <Input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>{editing ? "Save" : "Add rate"}</Button>
      </form>
    </DialogContent>
  );
}

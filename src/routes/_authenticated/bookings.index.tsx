import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Calendar, Eye, Building2 } from "lucide-react";
import { toast } from "sonner";
import { COMPANIES, DEFAULT_COMPANY, getCompany } from "@/lib/companies";

type Booking = {
  id: string; customer_id: string; package_id: string;
  start_date: string; end_date: string | null; travelers: number;
  total_amount: number; status: "inquiry"|"quoted"|"deposit_paid"|"confirmed"|"travelling"|"completed"|"cancelled"; notes: string | null;
  company?: string | null;
  customer?: { name: string } | null;
  package?: { name: string; price_per_person: number; duration_days: number } | null;
};

export const Route = createFileRoute("/_authenticated/bookings/")({ component: BookingsPage });

function BookingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => (await supabase.from("bookings")
      .select("*, customer:customers(name), package:tour_packages(name, price_per_person, duration_days)")
      .order("start_date", { ascending: false })).data ?? [],
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });
  const { data: packages } = useQuery({
    queryKey: ["packages-lite"],
    queryFn: async () => (await supabase.from("tour_packages").select("id,name,price_per_person,duration_days").eq("active", true).order("name")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  useEffect(() => {
    const ch = supabase.channel("bookings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Bookings</h1>
          <p className="text-muted-foreground">Real-time booking pipeline.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> New booking
        </Button>
      </div>

      <BookingDialog
        open={open} onOpenChange={setOpen} editing={editing}
        customers={customers ?? []} packages={packages ?? []}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <Card><CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No bookings yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold">{b.customer?.name ?? "—"}</div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">{b.package?.name}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="size-3" />{getCompany(b.company).name}</span>
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{b.start_date}{b.end_date ? ` → ${b.end_date}`: ""}</span>
                    <span className="flex items-center gap-1"><Users className="size-3" />{b.travelers}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-primary">€{Number(b.total_amount).toFixed(0)}</div>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link to="/bookings/$id" params={{ id: b.id }}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    inquiry: "bg-muted text-muted-foreground",
    quoted: "bg-primary/10 text-primary",
    deposit_paid: "bg-warning/20 text-warning-foreground",
    confirmed: "bg-accent text-accent-foreground",
    travelling: "bg-primary text-primary-foreground",
    completed: "bg-success text-success-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <Badge className={cls[status] ?? "bg-muted"} variant="secondary">{status.replace("_"," ")}</Badge>;
}

function BookingDialog({ open, onOpenChange, editing, customers, packages, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Booking | null;
  customers: { id: string; name: string }[];
  packages: { id: string; name: string; price_per_person: number; duration_days: number }[];
  onSaved: () => void;
}) {
  const [company, setCompany] = useState<string>(editing?.company ?? DEFAULT_COMPANY);
  const [customerId, setCustomerId] = useState(editing?.customer_id ?? "");
  const [packageId, setPackageId] = useState(editing?.package_id ?? "");
  const [travelers, setTravelers] = useState(editing?.travelers ?? 1);
  const [startDate, setStartDate] = useState(editing?.start_date ?? "");
  const [endDate, setEndDate] = useState(editing?.end_date ?? "");
  const [status, setStatus] = useState<Booking["status"]>(editing?.status ?? "inquiry");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [totalOverride, setTotalOverride] = useState<string>(editing ? String(editing.total_amount) : "");

  useEffect(() => {
    if (!open) return;
    setCompany(editing?.company ?? DEFAULT_COMPANY);
    setCustomerId(editing?.customer_id ?? "");
    setPackageId(editing?.package_id ?? "");
    setTravelers(editing?.travelers ?? 1);
    setStartDate(editing?.start_date ?? "");
    setEndDate(editing?.end_date ?? "");
    setStatus(editing?.status ?? "inquiry");
    setNotes(editing?.notes ?? "");
    setTotalOverride(editing ? String(editing.total_amount) : "");
  }, [open, editing]);

  const pkg = packages.find(p => p.id === packageId);
  const computedTotal = useMemo(() => (pkg ? pkg.price_per_person * travelers : 0), [pkg, travelers]);

  useEffect(() => {
    if (!editing && pkg && startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (pkg.duration_days - 1));
      setEndDate(d.toISOString().slice(0, 10));
    }
  }, [pkg, startDate, editing]);

  useEffect(() => {
    if (!editing) setTotalOverride(String(computedTotal));
  }, [computedTotal, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return toast.error("Choose a company first");
    if (!customerId || !packageId || !startDate) return toast.error("Customer, package and start date required");
    const { data: userData } = await supabase.auth.getUser();
    const payload: Record<string, any> = {
      user_id: userData.user!.id,
      company,
      customer_id: customerId,
      package_id: packageId,
      start_date: startDate,
      end_date: endDate || null,
      travelers,
      status,
      notes: notes || null,
      total_amount: Number(totalOverride) || 0,
    };
    const run = (p: Record<string, any>) => editing
      ? supabase.from("bookings").update(p as any).eq("id", editing.id)
      : supabase.from("bookings").insert(p as any);
    let { error } = await run(payload);
    // Fallback if the `company` column hasn't been added to the DB yet.
    if (error && /company/i.test(error.message)) {
      const { company: _omit, ...rest } = payload;
      ({ error } = await run(rest));
      if (!error) toast.warning("Saved, but the company field isn't stored yet — run the DB update to enable per-company tracking.");
    }
    if (error) return toast.error(error.message);
    toast.success(editing ? "Booking updated" : "Booking created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit booking" : "New booking"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Label className="flex items-center gap-1.5 text-primary">
              <Building2 className="size-4" /> Which company is this booking for?
            </Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {COMPANIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">Sales are tracked per company so you can see which brand performs best.</p>
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>
                {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — €{p.price_per_person}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tr">Travelers</Label>
              <Input id="tr" type="number" min={1} value={travelers} onChange={e => setTravelers(Number(e.target.value) || 1)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Booking["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="deposit_paid">Deposit paid</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="travelling">Travelling</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="total">Total (€)</Label>
              <Input id="total" type="number" min={0} step="0.01" value={totalOverride} onChange={e => setTotalOverride(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter><Button type="submit">Save booking</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

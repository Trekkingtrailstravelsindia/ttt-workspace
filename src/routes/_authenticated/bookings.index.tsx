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
  const { data: installments } = useQuery({
    queryKey: ["booking-installments-all"],
    queryFn: async () => (await supabase.from("booking_installments").select("booking_id, amount, paid")).data ?? [],
  });

  // Per-booking payment totals: received = paid installments, due = unpaid installments.
  const payByBooking = useMemo(() => {
    const m = new Map<string, { received: number; due: number }>();
    for (const it of (installments ?? []) as any[]) {
      const row = m.get(it.booking_id) ?? { received: 0, due: 0 };
      if (it.paid) row.received += Number(it.amount) || 0;
      else row.due += Number(it.amount) || 0;
      m.set(it.booking_id, row);
    }
    return m;
  }, [installments]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  useEffect(() => {
    const ch = supabase.channel("bookings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_installments" }, () => {
        qc.invalidateQueries({ queryKey: ["booking-installments-all"] });
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
        existingPay={editing ? payByBooking.get(editing.id) : undefined}
        customers={customers ?? []} packages={packages ?? []}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["booking-installments-all"] }); }}
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
                  {(() => {
                    const p = payByBooking.get(b.id);
                    const received = p?.received ?? 0;
                    const due = Math.max(Number(b.total_amount) - received, p?.due ?? 0);
                    if (!received && !due) return null;
                    return (
                      <div className="mt-0.5 flex justify-end gap-2 text-xs">
                        <span className="text-success">▲ €{received.toFixed(0)} received</span>
                        {due > 0.01 && <span className="text-destructive">€{due.toFixed(0)} due</span>}
                      </div>
                    );
                  })()}
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

function BookingDialog({ open, onOpenChange, editing, existingPay, customers, packages, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Booking | null;
  existingPay?: { received: number; due: number };
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

  const qc = useQueryClient();
  const [showNewCust, setShowNewCust] = useState(false);
  const [addingCust, setAddingCust] = useState(false);
  const [nc, setNc] = useState({ name: "", email: "", phone: "", country: "" });
  const [showNewPkg, setShowNewPkg] = useState(false);
  const [addingPkg, setAddingPkg] = useState(false);
  const [np, setNp] = useState({ name: "", price: "", days: "" });

  // Optional payment capture (new bookings only) → creates booking_installments rows.
  const [receivedAmount, setReceivedAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function addNewCustomer() {
    if (!nc.name.trim()) return toast.error("Customer name is required");
    setAddingCust(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("customers").insert({
      user_id: u.user!.id,
      name: nc.name.trim(),
      email: nc.email.trim() || null,
      phone: nc.phone.trim() || null,
      country: nc.country.trim() || null,
    }).select("id").single();
    setAddingCust(false);
    if (error || !data) return toast.error(error?.message ?? "Could not add customer");
    await qc.invalidateQueries({ queryKey: ["customers-lite"] });
    setCustomerId(data.id);
    setShowNewCust(false);
    setNc({ name: "", email: "", phone: "", country: "" });
    toast.success("Customer added");
  }

  async function addNewPackage() {
    if (!np.name.trim()) return toast.error("Package name is required");
    setAddingPkg(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("tour_packages").insert({
      user_id: u.user!.id,
      name: np.name.trim(),
      price_per_person: Number(np.price) || 0,
      duration_days: Number(np.days) || 1,
      active: true,
    }).select("id").single();
    setAddingPkg(false);
    if (error || !data) return toast.error(error?.message ?? "Could not add package");
    await qc.invalidateQueries({ queryKey: ["packages-lite"] });
    setPackageId(data.id);
    setShowNewPkg(false);
    setNp({ name: "", price: "", days: "" });
    toast.success("Package added");
  }

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
    setShowNewCust(false); setNc({ name: "", email: "", phone: "", country: "" });
    setShowNewPkg(false); setNp({ name: "", price: "", days: "" });
    setReceivedAmount(""); setReceivedDate(""); setDueAmount(""); setDueDate("");
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
      ? supabase.from("bookings").update(p as any).eq("id", editing.id).select("id").single()
      : supabase.from("bookings").insert(p as any).select("id").single();
    let { data: saved, error } = await run(payload);
    // Fallback if the `company` column hasn't been added to the DB yet.
    if (error && /company/i.test(error.message)) {
      const { company: _omit, ...rest } = payload;
      ({ data: saved, error } = await run(rest));
      if (!error) toast.warning("Saved, but the company field isn't stored yet — run the DB update to enable per-company tracking.");
    }
    if (error) return toast.error(error.message);

    // Record received / due payments as installments (new or existing bookings).
    const bookingId = editing ? editing.id : (saved as any)?.id;
    if (bookingId) {
      const rows: Record<string, any>[] = [];
      if (Number(receivedAmount) > 0) rows.push({
        booking_id: bookingId, user_id: userData.user!.id, label: "Received",
        amount: Number(receivedAmount), due_date: receivedDate || startDate,
        currency: "EUR", paid: true, paid_at: receivedDate || startDate,
      });
      if (Number(dueAmount) > 0) rows.push({
        booking_id: bookingId, user_id: userData.user!.id, label: "Balance due",
        amount: Number(dueAmount), due_date: dueDate || startDate,
        currency: "EUR", paid: false,
      });
      if (rows.length) {
        const { error: perr } = await supabase.from("booking_installments").insert(rows as any);
        if (perr) toast.error("Booking saved, but payment entries failed: " + perr.message);
      }
    }

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
            <div className="flex items-center justify-between">
              <Label>Customer</Label>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowNewCust(v => !v)}>
                {showNewCust ? "Pick existing" : "+ New customer"}
              </button>
            </div>
            {showNewCust ? (
              <div className="space-y-2 rounded-lg border bg-card/40 p-3">
                <Input placeholder="Full name *" value={nc.name} onChange={e => setNc(s => ({ ...s, name: e.target.value }))} maxLength={120} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Email" type="email" value={nc.email} onChange={e => setNc(s => ({ ...s, email: e.target.value }))} />
                  <Input placeholder="Phone" value={nc.phone} onChange={e => setNc(s => ({ ...s, phone: e.target.value }))} />
                </div>
                <Input placeholder="Country" value={nc.country} onChange={e => setNc(s => ({ ...s, country: e.target.value }))} />
                <Button type="button" size="sm" className="w-full" disabled={addingCust} onClick={addNewCustomer}>
                  <Plus className="size-3.5" /> {addingCust ? "Adding…" : "Add customer"}
                </Button>
              </div>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Package</Label>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowNewPkg(v => !v)}>
                {showNewPkg ? "Pick existing" : "+ New package"}
              </button>
            </div>
            {showNewPkg ? (
              <div className="space-y-2 rounded-lg border bg-card/40 p-3">
                <Input placeholder="Package name *" value={np.name} onChange={e => setNp(s => ({ ...s, name: e.target.value }))} maxLength={200} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Price / person (€)" type="number" min={0} step="0.01" value={np.price} onChange={e => setNp(s => ({ ...s, price: e.target.value }))} />
                  <Input placeholder="Duration (days)" type="number" min={1} value={np.days} onChange={e => setNp(s => ({ ...s, days: e.target.value }))} />
                </div>
                <Button type="button" size="sm" className="w-full" disabled={addingPkg} onClick={addNewPackage}>
                  <Plus className="size-3.5" /> {addingPkg ? "Adding…" : "Add package"}
                </Button>
              </div>
            ) : (
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — €{p.price_per_person}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
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
          <div className="rounded-lg border bg-card/40 p-3">
              <Label className="text-sm font-medium">{editing ? "Add a payment (optional)" : "Payment (optional)"}</Label>
              {editing && (existingPay?.received || existingPay?.due) ? (
                <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                  Already recorded: <span className="text-success">€{(existingPay.received ?? 0).toFixed(0)} received</span>
                  {(existingPay.due ?? 0) > 0 && <> · <span className="text-destructive">€{(existingPay.due ?? 0).toFixed(0)} due</span></>}. Amounts below are <b>added</b> as new entries.
                </p>
              ) : (
                <p className="mb-2 mt-0.5 text-xs text-muted-foreground">Log an amount already received and the balance due. Manage further payments on the booking's detail page.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rcv" className="text-xs text-muted-foreground">Received amount (€)</Label>
                  <Input id="rcv" type="number" min={0} step="0.01" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="rcvd" className="text-xs text-muted-foreground">Received on</Label>
                  <Input id="rcvd" type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="due" className="text-xs text-muted-foreground">Due amount (€)</Label>
                  <Input id="due" type="number" min={0} step="0.01" value={dueAmount} onChange={e => setDueAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="dued" className="text-xs text-muted-foreground">Due by</Label>
                  <Input id="dued" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              {Number(totalOverride) > 0 && (Number(receivedAmount) > 0 || Number(dueAmount) > 0) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Total €{Number(totalOverride).toFixed(0)} · Received €{(Number(receivedAmount) || 0).toFixed(0)} · Due €{(Number(dueAmount) || 0).toFixed(0)}
                  {(() => { const rem = Number(totalOverride) - (Number(receivedAmount) || 0) - (Number(dueAmount) || 0); return Math.abs(rem) > 0.01 ? ` · Unallocated €${rem.toFixed(0)}` : ""; })()}
                </p>
              )}
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

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Download, X, Wallet } from "lucide-react";
import { toast } from "sonner";
import { downloadInvoicePdf, type InvoiceLine } from "@/lib/invoice-pdf";

type Invoice = {
  id: string; invoice_number: string; booking_id: string | null; customer_id: string;
  issue_date: string; due_date: string | null; subtotal: number; tax_rate: number;
  tax_amount: number; total: number; currency: string; status: "draft"|"sent"|"paid"|"overdue"|"cancelled";
  notes: string | null; line_items: InvoiceLine[];
  customer?: { name: string; email: string | null; phone: string | null; country: string | null };
  booking?: {
    id: string; start_date: string | null; end_date: string | null; travelers: number | null;
    package?: { name: string | null; location: string | null } | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/invoices")({ component: InvoicesPage });

function InvoicesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("*, customer:customers(name, email, phone, country), booking:bookings(id, start_date, end_date, travelers, package:tour_packages(name, location))")
        .order("issue_date", { ascending: false });
      return (data ?? []) as unknown as Invoice[];
    },
  });
  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await supabase.from("payments").select("invoice_id,amount")).data ?? [],
  });
  const paidByInvoice = new Map<string, number>();
  (payments ?? []).forEach((p: any) => paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount)));

  const { data: customers } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => (await supabase.from("customers").select("id,name,email,phone,country").order("name")).data ?? [],
  });
  const { data: bookings } = useQuery({
    queryKey: ["bookings-lite"],
    queryFn: async () => (await supabase.from("bookings").select("id, customer_id, total_amount, travelers, package:tour_packages(name, price_per_person)").order("start_date", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete invoice?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Invoices</h1>
          <p className="text-muted-foreground">Generate and download invoices as PDF.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> New invoice
        </Button>
      </div>

      <InvoiceDialog
        open={open} onOpenChange={setOpen} editing={editing}
        customers={customers ?? []} bookings={bookings ?? []}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <Card><CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No invoices yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((inv) => {
            const paidAmt = paidByInvoice.get(inv.id) ?? 0;
            const balance = Number(inv.total) - paidAmt;
            return (
            <Card key={inv.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="mt-1 font-semibold">{inv.customer?.name}</div>
                  <div className="text-xs text-muted-foreground">Issued {inv.issue_date} · Due {inv.due_date ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-primary">{inv.currency} {Number(inv.total).toFixed(2)}</div>
                  {paidAmt > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Paid €{paidAmt.toFixed(2)} · <span className={balance > 0.01 ? "text-warning font-medium" : "text-success font-medium"}>Bal €{balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title="Record payment" onClick={() => setPayingInvoice(inv)}>
                    <Wallet className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Download PDF" onClick={() => {
                    if (!inv.customer) return toast.error("Customer missing");
                    downloadInvoicePdf({
                      ...inv,
                      line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
                      customer: inv.customer,
                      booking: inv.booking ? {
                        start_date: inv.booking.start_date,
                        end_date: inv.booking.end_date,
                        travelers: inv.booking.travelers,
                        package_name: inv.booking.package?.name ?? null,
                        location: inv.booking.package?.location ?? null,
                      } : null,
                    });
                  }}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(inv); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(inv.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <PaymentDialog
        invoice={payingInvoice}
        alreadyPaid={payingInvoice ? (paidByInvoice.get(payingInvoice.id) ?? 0) : 0}
        onClose={() => setPayingInvoice(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-accent text-accent-foreground",
    paid: "bg-success text-success-foreground",
    overdue: "bg-warning text-warning-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <Badge className={cls[status]} variant="secondary">{status}</Badge>;
}

type BookingLite = {
  id: string; customer_id: string; total_amount: number; travelers: number;
  package: { name: string; price_per_person: number } | null;
};

function InvoiceDialog({ open, onOpenChange, editing, customers, bookings, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Invoice | null;
  customers: { id: string; name: string; email: string | null; phone: string | null; country: string | null }[];
  bookings: BookingLite[];
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [bookingId, setBookingId] = useState<string>("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [status, setStatus] = useState<Invoice["status"]>("draft");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setCustomerId(editing?.customer_id ?? "");
    setBookingId(editing?.booking_id ?? "");
    setIssueDate(editing?.issue_date ?? today);
    setDueDate(editing?.due_date ?? "");
    setTaxRate(String(editing?.tax_rate ?? 0));
    setStatus(editing?.status ?? "draft");
    setNotes(editing?.notes ?? "");
    setLines(editing && Array.isArray(editing.line_items) && editing.line_items.length
      ? editing.line_items
      : [{ description: "", quantity: 1, unit_price: 0 }]);
  }, [open, editing]);

  // Auto-fill from booking
  useEffect(() => {
    if (!bookingId || editing) return;
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;
    setCustomerId(b.customer_id);
    setLines([{
      description: `${b.package?.name ?? "Tour package"} — ${b.travelers} traveler(s)`,
      quantity: b.travelers,
      unit_price: b.package?.price_per_person ?? (b.total_amount / (b.travelers || 1)),
    }]);
  }, [bookingId, bookings, editing]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), [lines]);
  const taxAmount = useMemo(() => subtotal * (Number(taxRate) || 0) / 100, [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  function updateLine(i: number, patch: Partial<InvoiceLine>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return toast.error("Customer required");
    if (!lines.some(l => l.description.trim())) return toast.error("At least one line item");

    const { data: userData } = await supabase.auth.getUser();

    let invoice_number = editing?.invoice_number;
    if (!invoice_number) {
      const { data: n, error: nErr } = await supabase.rpc("next_invoice_number");
      if (nErr || n == null) return toast.error(nErr?.message ?? "Failed to generate number");
      invoice_number = `INV-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
    }

    const payload = {
      user_id: userData.user!.id,
      invoice_number,
      customer_id: customerId,
      booking_id: bookingId || null,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal, tax_rate: Number(taxRate) || 0, tax_amount: taxAmount, total,
      currency: "EUR",
      status, notes: notes || null,
      line_items: lines.filter(l => l.description.trim()),
    };

    const { error } = editing
      ? await supabase.from("invoices").update(payload).eq("id", editing.id)
      : await supabase.from("invoices").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Invoice updated" : "Invoice created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? `Edit ${editing.invoice_number}` : "New invoice"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>From booking (optional)</Label>
              <Select value={bookingId} onValueChange={setBookingId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.package?.name ?? "Booking"} · €{Number(b.total_amount).toFixed(0)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="issue">Issue date</Label>
              <Input id="issue" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Invoice["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","sent","paid","overdue","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Line items</Label>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_auto] gap-2">
                  <Input placeholder="Description" value={l.description} onChange={e => updateLine(i, { description: e.target.value })} />
                  <Input type="number" min={1} value={l.quantity} onChange={e => updateLine(i, { quantity: Number(e.target.value) || 0 })} />
                  <Input type="number" min={0} step="0.01" value={l.unit_price} onChange={e => updateLine(i, { unit_price: Number(e.target.value) || 0 })} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, x) => x !== i))} disabled={lines.length === 1}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { description: "", quantity: 1, unit_price: 0 }])}>
                <Plus className="size-4" /> Add line
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tax">Tax rate (%)</Label>
              <Input id="tax" type="number" min={0} step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>€{taxAmount.toFixed(2)}</span></div>
              <div className="mt-1 flex justify-between font-semibold text-primary"><span>Total</span><span>€{total.toFixed(2)}</span></div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter><Button type="submit">Save invoice</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ invoice, alreadyPaid, onClose, onSaved }: {
  invoice: Invoice | null;
  alreadyPaid: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (invoice) {
      const bal = Number(invoice.total) - alreadyPaid;
      setAmount(bal > 0 ? bal.toFixed(2) : "");
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
    }
  }, [invoice, alreadyPaid]);

  if (!invoice) return null;
  const balance = Number(invoice.total) - alreadyPaid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      user_id: u.user!.id,
      invoice_id: invoice.id,
      amount: amt,
      method: method as any,
      payment_date: date,
      reference: reference || null,
    });
    if (error) return toast.error(error.message);
    // Auto-mark paid if balance cleared
    if (alreadyPaid + amt >= Number(invoice.total) - 0.01) {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice.id);
    }
    toast.success("Payment recorded");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment · {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="mb-3 rounded-lg bg-muted/40 p-3 text-sm">
          <div className="flex justify-between"><span>Invoice total</span><span>€{Number(invoice.total).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Already paid</span><span>€{alreadyPaid.toFixed(2)}</span></div>
          <div className="mt-1 flex justify-between font-semibold"><span>Balance</span><span>€{balance.toFixed(2)}</span></div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="amt">Amount</Label><Input id="amt" type="number" step="0.01" min={0.01} value={amount} onChange={e => setAmount(e.target.value)} required /></div>
            <div><Label htmlFor="pdate">Date</Label><Input id="pdate" type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["cash","bank_transfer","card","stripe","paypal","other"].map(m => <SelectItem key={m} value={m}>{m.replace("_"," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="ref">Reference (optional)</Label><Input id="ref" value={reference} onChange={e => setReference(e.target.value)} /></div>
          <DialogFooter><Button type="submit">Record payment</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

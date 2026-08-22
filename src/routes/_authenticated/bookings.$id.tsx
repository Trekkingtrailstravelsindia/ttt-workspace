import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/hooks/use-current-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Upload, Download, FileText, TrendingUp, TrendingDown, MessageSquare, History, UserCheck, MapPin, CheckSquare2, FileDown, CalendarClock, Handshake, Check, Send, Tags } from "lucide-react";
import { toast } from "sonner";
import { downloadItineraryPdf } from "@/lib/itinerary-pdf";

// Category values map to the existing `expense_category` enum in the DB
// (stay/activities/transport/other) but are labelled for Finland operations.
const HOTEL = "stay", ACTIVITY = "activities", TRANSFER = "transport", OTHER = "other";

const CATEGORIES = [
  { value: HOTEL, label: "Hotel" },
  { value: ACTIVITY, label: "Activity" },
  { value: TRANSFER, label: "Transfer / Ferry" },
  { value: OTHER, label: "Other" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

// Quick-fill presets per category (Finland operations)
const PRESETS: Record<Category, string[]> = {
  [HOTEL]: ["Helsinki Hotel", "Kuusamo Hotel", "Glass Igloo", "Tallinn Hotel"],
  [ACTIVITY]: [
    "Husky Safari", "Reindeer Safari", "Snowmobile Ride", "Ranua Wildlife Park",
    "Icebreaker Cruise", "Oulanka National Park", "Northern Lights Tour", "Ruka Coaster Tour",
  ],
  [TRANSFER]: ["Helsinki Transfer", "Lapland Transfer", "Tallinn Transfer", "Tallinn Ferry"],
  [OTHER]: [],
};

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

type Expense = {
  id: string; booking_id: string; category: Category;
  description: string; amount: number; currency: string;
  expense_date: string; notes: string | null;
  title: string | null; start_date: string | null; end_date: string | null;
  guests: number | null; kids: number | null; route: string | null;
};

type Doc = {
  id: string; booking_id: string; file_path: string;
  file_name: string; mime_type: string | null; file_size: number | null;
  created_at: string; expense_id?: string | null;
};

export const Route = createFileRoute("/_authenticated/bookings/$id")({ component: BookingDetail });

function BookingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canSeeFinancials, userId } = useCurrentRole();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => (await supabase.from("bookings")
      .select("*, customer:customers(name,email,phone), package:tour_packages(name, price_per_person, duration_days)")
      .eq("id", id).maybeSingle()).data,
  });

  const { data: expenses } = useQuery({
    queryKey: ["booking-expenses", id],
    queryFn: async () => (await supabase.from("booking_expenses")
      .select("*").eq("booking_id", id).order("expense_date", { ascending: false })).data ?? [],
    enabled: canSeeFinancials,
  });

  const { data: docs } = useQuery({
    queryKey: ["booking-docs", id],
    queryFn: async () => (await supabase.from("booking_documents")
      .select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, email, full_name").order("email")).data ?? [],
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["booking-notes", id],
    queryFn: async () => (await supabase.from("booking_notes")
      .select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["booking-activity", id],
    queryFn: async () => (await supabase.from("booking_activity")
      .select("*").eq("booking_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const { data: itinerary = [] } = useQuery({
    queryKey: ["booking-itinerary", id],
    queryFn: async () => (await supabase.from("booking_itinerary").select("*").eq("booking_id", id).order("day_number")).data ?? [],
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["booking-checklist", id],
    queryFn: async () => (await supabase.from("booking_checklist").select("*").eq("booking_id", id).order("created_at")).data ?? [],
  });

  const { data: installments = [] } = useQuery({
    queryKey: ["booking-installments", id],
    queryFn: async () => (await supabase.from("booking_installments").select("*").eq("booking_id", id).order("due_date")).data ?? [],
    enabled: canSeeFinancials,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["booking-commissions", id],
    queryFn: async () => (await supabase.from("commissions").select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? [],
    enabled: canSeeFinancials,
  });

  useEffect(() => {
    const ch = supabase.channel(`booking-exp-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_expenses", filter: `booking_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["booking-expenses", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_notes", filter: `booking_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["booking-notes", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_activity", filter: `booking_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["booking-activity", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const totals = useMemo(() => {
    const sell = Number(booking?.total_amount ?? 0);
    const totalExp = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const byCat: Record<string, number> = {};
    (expenses ?? []).forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount); });
    const profit = sell - totalExp;
    const margin = sell > 0 ? (profit / sell) * 100 : 0;
    return { sell, totalExp, byCat, profit, margin };
  }, [booking, expenses]);

  async function assignTo(newId: string | null) {
    const { error } = await supabase.from("bookings").update({ assigned_to: newId }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(newId ? "Assigned" : "Unassigned");
    qc.invalidateQueries({ queryKey: ["booking", id] });
  }

  async function updateCurrency(currency: string) {
    const { error } = await supabase.from("bookings").update({ currency }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking", id] });
  }

  async function updateFx(fx: number) {
    const { error } = await supabase.from("bookings").update({ fx_rate: fx }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking", id] });
  }

  const cur = booking?.currency || "EUR";
  const symbol = (c: string) => ({ EUR: "€", USD: "$", INR: "₹", GBP: "£" } as any)[c] || (c + " ");
  const sym = symbol(cur);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (!booking) return <div className="py-12 text-center text-muted-foreground">Booking not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/bookings" })}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Booking</div>
            <h1 className="font-display text-3xl text-primary">{booking.customer?.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {booking.package?.name} · {booking.start_date}{booking.end_date ? ` → ${booking.end_date}` : ""} · {booking.travelers} adult(s){booking.kids ? ` + ${booking.kids} kid(s)` : ""}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{booking.status}</Badge>
              <div className="flex items-center gap-2 text-xs">
                <UserCheck className="size-3.5 text-muted-foreground" />
                <Select
                  value={booking.assigned_to ?? "__unassigned__"}
                  onValueChange={(v) => assignTo(v === "__unassigned__" ? null : v)}
                >
                  <SelectTrigger className="h-7 w-52 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {canSeeFinancials && (
            <div className="space-y-2 text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Package sell price</div>
              <div className="text-3xl font-semibold text-primary">{sym}{totals.sell.toFixed(2)}</div>
              <div className="flex items-center justify-end gap-2 text-xs">
                <Select value={cur} onValueChange={updateCurrency}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EUR","USD","GBP","INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {cur !== "EUR" && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">FX→EUR</span>
                    <Input type="number" step="0.0001" defaultValue={booking.fx_rate ?? 1}
                      onBlur={e => updateFx(Number(e.target.value) || 1)}
                      className="h-7 w-20 text-xs" />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canSeeFinancials && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total expenses" value={`${sym}${totals.totalExp.toFixed(2)}`} tone="neutral" />
            <StatCard
              label={totals.profit >= 0 ? "Profit" : "Loss"}
              value={`${sym}${Math.abs(totals.profit).toFixed(2)}`}
              tone={totals.profit >= 0 ? "positive" : "negative"}
              icon={totals.profit >= 0 ? TrendingUp : TrendingDown}
            />
            <StatCard label="Margin" value={`${totals.margin.toFixed(1)}%`} tone={totals.profit >= 0 ? "positive" : "negative"} />
          </div>
          <ExpensesCard bookingId={id} expenses={(expenses ?? []) as any} byCat={totals.byCat} docs={(docs ?? []) as any} />
          <InstallmentsCard bookingId={id} installments={installments as any[]} currency={cur} sym={sym} bookingTotal={Number(booking?.total_amount ?? 0)} />
          <CommissionsCard bookingId={id} commissions={commissions as any[]} currency={cur} sym={sym} />
        </>
      )}

      <ItineraryCard bookingId={id} itinerary={itinerary as any[]} booking={booking} />

      <ChecklistCard bookingId={id} items={checklist as any[]} />

      <WhatsAppCard booking={booking} sym={sym} totalSell={totals.sell} />

      <NotesCard bookingId={id} notes={notes as any[]} staff={staff as any[]} currentUserId={userId} />

      <DocumentsCard bookingId={id} docs={docs ?? []} />

      <ActivityCard activity={activity as any[]} staff={staff as any[]} />
    </div>
  );
}

function NotesCard({ bookingId, notes, staff, currentUserId }: { bookingId: string; notes: any[]; staff: any[]; currentUserId: string | null }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const staffById = new Map(staff.map(s => [s.id, s]));

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !currentUserId) return;
    setSaving(true);
    // parse @mentions from email prefixes or full names
    const mentions = staff
      .filter(s => new RegExp(`@${(s.full_name || s.email.split("@")[0]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(body))
      .map(s => s.id);
    const { error } = await supabase.from("booking_notes").insert({
      booking_id: bookingId, author_id: currentUserId, body: body.trim(), mentions,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["booking-notes", bookingId] });
  }

  async function del(id: string) {
    if (!confirm("Delete note?")) return;
    const { error } = await supabase.from("booking_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-notes", bookingId] });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="size-5" /> Internal notes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addNote} className="space-y-2">
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={2}
            placeholder="Add note. Use @name to mention a teammate." maxLength={1000} />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving || !body.trim()}>Post note</Button>
          </div>
        </form>
        {notes.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No notes yet.</div>
        ) : (
          <div className="space-y-3">
            {notes.map(n => {
              const author = staffById.get(n.author_id);
              return (
                <div key={n.id} className="rounded-lg border bg-card/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {author?.full_name || author?.email || "Someone"} · {new Date(n.created_at).toLocaleString()}
                    </div>
                    {n.author_id === currentUserId && (
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => del(n.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{n.body}</div>
                  {n.mentions?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.mentions.map((mid: string) => {
                        const s = staffById.get(mid);
                        return s ? <Badge key={mid} variant="outline" className="text-[10px]">@{s.full_name || s.email.split("@")[0]}</Badge> : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity, staff }: { activity: any[]; staff: any[] }) {
  const staffById = new Map(staff.map(s => [s.id, s]));
  if (activity.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" /> Activity log</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {activity.map(a => {
            const actor = staffById.get(a.actor_id);
            return (
              <div key={a.id} className="flex items-start gap-3 border-l-2 border-primary/30 pl-3">
                <div className="text-xs text-muted-foreground w-40 shrink-0">
                  {new Date(a.created_at).toLocaleString()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{actor?.full_name || actor?.email || "System"}</span>{" "}
                  <span className="text-muted-foreground">
                    {a.action === "insert" ? "created" : a.action === "update" ? "updated" : "deleted"} {a.entity.replace("booking_", "").replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


function StatCard({ label, value, tone, icon: Icon }: { label: string; value: string; tone: "positive"|"negative"|"neutral"; icon?: React.ComponentType<{ className?: string }> }) {
  const toneCls = tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {Icon ? <Icon className={`size-4 ${toneCls}`} /> : null}
        </div>
        <div className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ExpensesCard({ bookingId, expenses, byCat, docs }: { bookingId: string; expenses: Expense[]; byCat: Record<string, number>; docs: Doc[] }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<Category>(HOTEL);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState("");
  const [kids, setKids] = useState("");
  const [route, setRoute] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rates = [] } = useQuery({
    queryKey: ["rate-cards-for-expenses"],
    queryFn: async () => (await supabase
      .from("supplier_rates")
      .select("id, service_name, amount, currency, rate_type, supplier:suppliers(name)")
      .order("service_name")).data ?? [],
  });

  const matchedRate = useMemo(
    () => (rates as any[]).find(r => (r.service_name ?? "").trim().toLowerCase() === title.trim().toLowerCase()),
    [rates, title]
  );

  // When a rate card is applied, remember its per-unit price so the cost can
  // recompute as (rate × adults) for per-person rates.
  const [rateBasis, setRateBasis] = useState<{ unit: number; perPax: boolean } | null>(null);

  function applyRate(r: any) {
    setTitle(r.service_name);
    setRateBasis({ unit: Number(r.amount), perPax: r.rate_type === "per_pax" });
  }

  useEffect(() => {
    if (!rateBasis) return;
    const totalPax = Math.max(1, (Number(guests) || 0) + (Number(kids) || 0) || 1);
    setAmount(String(rateBasis.perPax ? rateBasis.unit * totalPax : rateBasis.unit));
  }, [rateBasis, guests, kids]);

  function onAmountChange(v: string) {
    setRateBasis(null); // manual edit detaches from the rate card
    setAmount(v);
  }

  function reset() {
    setTitle(""); setAmount(""); setEndDate(""); setGuests(""); setKids(""); setRoute(""); setNotes(""); setRateBasis(null);
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return toast.error("Name and amount are required");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("booking_expenses").insert({
      user_id: u.user!.id,
      booking_id: bookingId,
      category,
      title: title.trim(),
      description: title.trim(),
      amount: Number(amount),
      expense_date: startDate,
      start_date: startDate,
      end_date: category === HOTEL ? (endDate || null) : null,
      guests: guests ? Number(guests) : null,
      kids: kids ? Number(kids) : null,
      route: category === TRANSFER ? (route.trim() || null) : null,
      notes: notes.trim() || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    reset();
    qc.invalidateQueries({ queryKey: ["booking-expenses", bookingId] });
  }

  async function removeExpense(id: string) {
    if (!confirm("Delete this expense? Any documents attached to it will be removed too.")) return;
    const { error } = await supabase.from("booking_expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-expenses", bookingId] });
    qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
  }

  async function uploadFor(expenseId: string, file: File) {
    if (file.size > 20 * 1024 * 1024) return toast.error("Max file size 20MB");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${uid}/${bookingId}/exp-${expenseId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("booking-documents").upload(path, file, { contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { error: insErr } = await supabase.from("booking_documents").insert({
      user_id: uid, booking_id: bookingId, expense_id: expenseId, file_path: path,
      file_name: file.name, mime_type: file.type || null, file_size: file.size,
    } as any);
    if (insErr) return toast.error(insErr.message);
    toast.success("Document attached");
    qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
  }

  async function openDoc(d: Doc) {
    const { data, error } = await supabase.storage.from("booking-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    window.open(data.signedUrl, "_blank");
  }

  async function removeDoc(d: Doc) {
    if (!confirm(`Delete "${d.file_name}"?`)) return;
    await supabase.storage.from("booking-documents").remove([d.file_path]);
    const { error } = await supabase.from("booking_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={addExpense} className="space-y-3 rounded-lg border bg-card/40 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>{category === TRANSFER ? "Transfer type" : "Name"}</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                placeholder={category === HOTEL ? "e.g. Kuusamo Hotel" : category === ACTIVITY ? "e.g. Husky Safari" : category === TRANSFER ? "e.g. Helsinki Transfer" : "e.g. Travel insurance"} />
              {PRESETS[category].length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {PRESETS[category].map(p => (
                    <button key={p} type="button" onClick={() => { const r = (rates as any[]).find(x => (x.service_name ?? "").trim().toLowerCase() === p.toLowerCase()); if (r) applyRate(r); else { setTitle(p); setRateBasis(null); } }}
                      className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {rates.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Label className="flex items-center gap-1"><Tags className="size-3.5" /> Auto-fill from rate card</Label>
                <Select value="" onValueChange={(v) => { const r = (rates as any[]).find(x => x.id === v); if (r) applyRate(r); }}>
                  <SelectTrigger><SelectValue placeholder="Pick a saved rate…" /></SelectTrigger>
                  <SelectContent>
                    {(rates as any[]).map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.service_name} — {r.currency} {Number(r.amount).toFixed(0)}{r.supplier?.name ? ` · ${r.supplier.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {matchedRate && (
                <div className="pb-2 text-xs text-muted-foreground">
                  Rate card: <span className="font-medium text-foreground">{matchedRate.currency} {Number(matchedRate.amount).toFixed(0)}</span>
                  {matchedRate.rate_type === "per_pax" && <span className="ml-1">× {Math.max(1, (Number(guests) || 0) + (Number(kids) || 0) || 1)} traveler(s)</span>}
                  <button type="button" className="ml-2 rounded border px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground" onClick={() => applyRate(matchedRate)}>Apply</button>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>{category === HOTEL ? "Check-in" : "Date"}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            {category === HOTEL && (
              <div>
                <Label>Check-out</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
            <div>
              <Label>Adults</Label>
              <Input type="number" min={1} value={guests} onChange={e => setGuests(e.target.value)} placeholder="1" />
            </div>
            <div>
              <Label>Kids</Label>
              <Input type="number" min={0} value={kids} onChange={e => setKids(e.target.value)} placeholder="0" />
            </div>
            {category === TRANSFER && (
              <div className="sm:col-span-2">
                <Label>Route (pickup → drop-off)</Label>
                <Input value={route} onChange={e => setRoute(e.target.value)} maxLength={200} placeholder="Airport → Hotel" />
              </div>
            )}
            <div>
              <Label>Cost (€)</Label>
              <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full"><Plus className="size-4" /> Add</Button>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
        </form>

        {/* By-category summary */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(c => (
              <div key={c.value} className="rounded-lg border bg-card/60 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="text-sm font-semibold">€{(byCat[c.value] ?? 0).toFixed(0)}</div>
              </div>
            ))}
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</div>
        ) : (
          <div className="divide-y">
            {expenses.map(e => {
              const expDocs = docs.filter(d => d.expense_id === e.id);
              const paxInfo = e.category === ACTIVITY ? [
                e.guests ? `${e.guests} adult(s)` : null,
                e.kids ? `${e.kids} kid(s)` : null,
              ].filter(Boolean).join(", ") : null;
              const meta = [
                e.category === HOTEL && e.end_date ? `${e.start_date ?? e.expense_date} → ${e.end_date}` : (e.start_date ?? e.expense_date),
                paxInfo || (e.category === ACTIVITY && (e.guests || e.kids) ? `${(e.guests || 0) + (e.kids || 0)} person(s)` : null),
                e.category === TRANSFER && e.route ? e.route : null,
                e.notes || null,
              ].filter(Boolean).join(" · ");
              return (
                <div key={e.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{CAT_LABEL[e.category] ?? e.category}</Badge>
                        <span className="truncate font-medium">{e.title || e.description}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{meta}</div>
                    </div>
                    <div className="font-semibold">€{Number(e.amount).toFixed(2)}</div>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon" title="Attach document">
                        <label className="cursor-pointer">
                          <Upload className="size-4" />
                          <input type="file" className="hidden" onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) uploadFor(e.id, f); }} />
                        </label>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeExpense(e.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {expDocs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-1">
                      {expDocs.map(d => (
                        <span key={d.id} className="inline-flex items-center gap-1 rounded-md border bg-card/60 px-2 py-1 text-xs">
                          <FileText className="size-3.5 text-primary" />
                          <button type="button" className="max-w-[160px] truncate hover:underline" onClick={() => openDoc(d)}>{d.file_name}</button>
                          <button type="button" onClick={() => openDoc(d)} title="Download"><Download className="size-3.5 text-muted-foreground hover:text-foreground" /></button>
                          <button type="button" onClick={() => removeDoc(d)} title="Delete"><Trash2 className="size-3.5 text-destructive" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsCard({ bookingId, docs }: { bookingId: string; docs: Doc[] }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const generalDocs = docs.filter(d => !d.expense_id);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Max file size 20MB");
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${uid}/${bookingId}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("booking-documents").upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error: insErr } = await supabase.from("booking_documents").insert({
      user_id: uid, booking_id: bookingId, expense_id: null, file_path: path,
      file_name: file.name, mime_type: file.type || null, file_size: file.size,
    } as any);
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Document uploaded");
    qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
  }

  async function download(d: Doc) {
    const { data, error } = await supabase.storage.from("booking-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Failed");
    window.open(data.signedUrl, "_blank");
  }

  async function remove(d: Doc) {
    if (!confirm(`Delete "${d.file_name}"?`)) return;
    await supabase.storage.from("booking-documents").remove([d.file_path]);
    const { error } = await supabase.from("booking_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>General documents</CardTitle>
          <p className="text-xs text-muted-foreground">Booking-wide files. Hotel / activity / transfer documents attach to each expense above.</p>
        </div>
        <Button asChild size="sm" disabled={uploading}>
          <label className="cursor-pointer">
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload"}
            <input type="file" className="hidden" onChange={onUpload} />
          </label>
        </Button>
      </CardHeader>
      <CardContent>
        {generalDocs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No general documents attached yet.</div>
        ) : (
          <div className="divide-y">
            {generalDocs.map(d => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB · ` : ""}{new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => download(d)}>
                    <Download className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(d)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItineraryCard({ bookingId, itinerary, booking }: { bookingId: string; itinerary: any[]; booking: any }) {
  const qc = useQueryClient();
  const [dayNum, setDayNum] = useState<string>("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [activities, setActivities] = useState("");
  const [saving, setSaving] = useState(false);

  const nextDay = (itinerary.reduce((m, i) => Math.max(m, i.day_number), 0) || 0) + 1;

  async function addDay(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    setSaving(true);
    const { error } = await supabase.from("booking_itinerary").insert({
      booking_id: bookingId,
      day_number: Number(dayNum) || nextDay,
      title: title.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      activities: activities.trim() || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDayNum(""); setTitle(""); setLocation(""); setDescription(""); setActivities("");
    qc.invalidateQueries({ queryKey: ["booking-itinerary", bookingId] });
  }

  async function del(id: string) {
    if (!confirm("Delete this day?")) return;
    const { error } = await supabase.from("booking_itinerary").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-itinerary", bookingId] });
  }

  function exportPdf() {
    if (itinerary.length === 0) return toast.error("Add itinerary days first");
    downloadItineraryPdf({
      customer: booking.customer,
      package: booking.package,
      start_date: booking.start_date,
      end_date: booking.end_date,
      travelers: booking.travelers,
      days: itinerary as any,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><MapPin className="size-5" /> Itinerary</CardTitle>
        <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="size-4" /> Guest PDF</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addDay} className="grid gap-2 sm:grid-cols-6">
          <div>
            <Label>Day #</Label>
            <Input type="number" min={1} placeholder={String(nextDay)} value={dayNum} onChange={e => setDayNum(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Arrival in Rovaniemi" maxLength={120} />
          </div>
          <div className="sm:col-span-2">
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City / hotel" maxLength={120} />
          </div>
          <div className="sm:col-span-3">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="sm:col-span-3">
            <Label>Activities</Label>
            <Textarea value={activities} onChange={e => setActivities(e.target.value)} rows={2} maxLength={500} placeholder="Husky safari, Aurora hunt…" />
          </div>
          <div className="sm:col-span-6 flex justify-end">
            <Button type="submit" disabled={saving}><Plus className="size-4" /> Add day</Button>
          </div>
        </form>

        {itinerary.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No days planned yet.</div>
        ) : (
          <div className="space-y-3">
            {itinerary.map(d => (
              <div key={d.id} className="rounded-lg border bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge>Day {d.day_number}</Badge>
                      <span className="font-medium">{d.title}</span>
                    </div>
                    {d.location && <div className="mt-0.5 text-xs text-muted-foreground">{d.location}</div>}
                    {d.description && <div className="mt-2 whitespace-pre-wrap text-sm">{d.description}</div>}
                    {d.activities && <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground"><span className="font-medium text-foreground">Activities:</span> {d.activities}</div>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CHECKLIST_TEMPLATE = [
  { category: "documents", item: "Passport copy received" },
  { category: "documents", item: "Visa (if required)" },
  { category: "travel", item: "Flight details shared" },
  { category: "travel", item: "Arrival time confirmed" },
  { category: "preferences", item: "Dietary requirements" },
  { category: "preferences", item: "Emergency contact" },
];

function ChecklistCard({ bookingId, items }: { bookingId: string; items: any[] }) {
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState("");
  const [newCat, setNewCat] = useState("general");
  const [saving, setSaving] = useState(false);

  async function toggle(id: string, val: boolean) {
    const { error } = await supabase.from("booking_checklist").update({ is_completed: val }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
  }

  async function add(item: string, category: string) {
    const { error } = await supabase.from("booking_checklist").insert({ booking_id: bookingId, item, category } as any);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
  }

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setSaving(true);
    await add(newItem.trim(), newCat);
    setSaving(false);
    setNewItem("");
  }

  async function loadTemplate() {
    if (items.length > 0 && !confirm("Add default checklist items?")) return;
    for (const t of CHECKLIST_TEMPLATE) await add(t.item, t.category);
  }

  async function del(id: string) {
    const { error } = await supabase.from("booking_checklist").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
  }

  const done = items.filter(i => i.is_completed).length;
  const grouped = items.reduce<Record<string, any[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><CheckSquare2 className="size-5" /> Guest checklist <span className="text-sm text-muted-foreground">({done}/{items.length})</span></CardTitle>
        {items.length === 0 && <Button size="sm" variant="outline" onClick={loadTemplate}>Load default</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addCustom} className="grid gap-2 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Label>Category</Label>
            <Input value={newCat} onChange={e => setNewCat(e.target.value)} maxLength={40} />
          </div>
          <div className="sm:col-span-3">
            <Label>Item</Label>
            <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="e.g. Winter clothing size" maxLength={200} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={saving}><Plus className="size-4" /> Add</Button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No checklist items yet. Load the default set to start.</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{cat}</div>
                <div className="divide-y rounded-lg border">
                  {list.map(i => (
                    <label key={i.id} className="flex items-center gap-3 px-3 py-2">
                      <input type="checkbox" checked={i.is_completed} onChange={e => toggle(i.id, e.target.checked)} className="size-4 accent-primary" />
                      <span className={`flex-1 text-sm ${i.is_completed ? "text-muted-foreground line-through" : ""}`}>{i.item}</span>
                      <Button variant="ghost" size="icon" onClick={() => del(i.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstallmentsCard({ bookingId, installments, currency, sym, bookingTotal }: { bookingId: string; installments: any[]; currency: string; sym: string; bookingTotal: number }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("Deposit");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [method, setMethod] = useState("");

  const totalPlanned = installments.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = installments.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const balanceDue = bookingTotal - totalPaid;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !due) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("booking_installments").insert({
      booking_id: bookingId, user_id: u.user!.id, label, amount: Number(amount), due_date: due, currency,
      method: method.trim() || null,
    } as any);
    if (error) return toast.error(error.message);
    setAmount(""); setDue(""); setMethod("");
    qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
  }
  async function togglePaid(row: any) {
    const { error } = await supabase.from("booking_installments").update({
      paid: !row.paid, paid_at: !row.paid ? new Date().toISOString() : null
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
  }
  async function del(id: string) {
    if (!confirm("Delete installment?")) return;
    const { error } = await supabase.from("booking_installments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-5" /> Payment schedule</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Booking total</div>
            <div className="text-xl font-semibold">{sym}{bookingTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Received</div>
            <div className="text-xl font-semibold text-primary">{sym}{totalPaid.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Balance due</div>
            <div className={`text-xl font-semibold ${balanceDue > 0 ? "text-destructive" : ""}`}>{sym}{balanceDue.toFixed(2)}</div>
          </div>
        </div>
        {Math.abs(totalPlanned - bookingTotal) > 0.01 && installments.length > 0 && (
          <p className="text-xs text-muted-foreground">Scheduled across payments: {sym}{totalPlanned.toFixed(2)}</p>
        )}

        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_120px_150px_150px_auto]">
          <Input placeholder="Label (Deposit, 2nd payment…)" value={label} onChange={e => setLabel(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
          <Input placeholder="Method/source" value={method} onChange={e => setMethod(e.target.value)} />
          <Button type="submit" size="sm"><Plus className="size-4" /> Add</Button>
        </form>

        {installments.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">No installments planned.</div>
        ) : (
          <div className="space-y-2">
            {installments.map(i => {
              const overdue = !i.paid && new Date(i.due_date) < new Date(new Date().toDateString());
              return (
                <div key={i.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${i.paid ? "bg-muted/40" : overdue ? "border-destructive/60" : "bg-card/60"}`}>
                  <div className="flex items-center gap-3">
                    <Button variant={i.paid ? "default" : "outline"} size="icon" className="size-8" onClick={() => togglePaid(i)}>
                      <Check className="size-4" />
                    </Button>
                    <div>
                      <div className="font-medium text-sm">{i.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Due {i.due_date}{i.method ? ` · ${i.method}` : ""} {overdue && <Badge variant="destructive" className="ml-1">Overdue</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-semibold">{sym}{Number(i.amount).toFixed(2)}</div>
                      {i.paid && i.paid_at && <div className="text-xs text-muted-foreground">Paid {new Date(i.paid_at).toLocaleDateString()}</div>}
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => del(i.id)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommissionsCard({ bookingId, commissions, currency, sym }: { bookingId: string; commissions: any[]; currency: string; sym: string }) {
  const qc = useQueryClient();
  const [agent, setAgent] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");

  const totalPending = commissions.filter(c => c.status !== "paid").reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!agent || (!amount && !rate)) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("commissions").insert({
      booking_id: bookingId, user_id: u.user!.id, agent_name: agent,
      rate_percent: rate ? Number(rate) : null,
      amount: Number(amount || 0), currency,
    });
    if (error) return toast.error(error.message);
    setAgent(""); setRate(""); setAmount("");
    qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
  }
  async function markPaid(row: any) {
    const paid = row.status !== "paid";
    const { error } = await supabase.from("commissions").update({
      status: paid ? "paid" : "pending", paid_at: paid ? new Date().toISOString() : null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
  }
  async function del(id: string) {
    if (!confirm("Delete commission?")) return;
    const { error } = await supabase.from("commissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="size-5" /> Agent commissions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Pending payout</div>
            <div className="text-xl font-semibold">{sym}{totalPending.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Paid out</div>
            <div className="text-xl font-semibold text-primary">{sym}{totalPaid.toFixed(2)}</div>
          </div>
        </div>

        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1.5fr_100px_120px_auto]">
          <Input placeholder="Agent / partner name" value={agent} onChange={e => setAgent(e.target.value)} />
          <Input type="number" step="0.1" placeholder="Rate %" value={rate} onChange={e => setRate(e.target.value)} />
          <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <Button type="submit" size="sm"><Plus className="size-4" /> Add</Button>
        </form>

        {commissions.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">No commissions yet.</div>
        ) : (
          <div className="space-y-2">
            {commissions.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card/60 p-3">
                <div>
                  <div className="font-medium text-sm">{c.agent_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.rate_percent ? `${c.rate_percent}% · ` : ""}
                    <Badge variant={c.status === "paid" ? "default" : "secondary"} className="ml-1">{c.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{sym}{Number(c.amount).toFixed(2)}</div>
                  <Button variant="outline" size="sm" onClick={() => markPaid(c)}>
                    {c.status === "paid" ? "Undo" : "Mark paid"}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => del(c.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppCard({ booking, sym, totalSell }: { booking: any; sym: string; totalSell: number }) {
  const name = booking?.customer?.name ?? "there";
  const first = String(name).split(" ")[0];
  const pkg = booking?.package?.name ?? "your tour";
  const start = booking?.start_date ?? "";
  const travelers = booking?.travelers ?? 1;
  const phoneRaw = booking?.customer?.phone ?? "";
  const phone = phoneRaw.replace(/[^\d]/g, "");

  const templates = [
    {
      key: "quote",
      label: "Send quote",
      msg: `Hi ${first}! 👋\n\nThank you for your interest in *${pkg}* with Trekking Trails Travels. Here's your personalized quote:\n\n📅 Departure: ${start}\n👥 Travelers: ${travelers}\n💰 Total: ${sym}${totalSell.toFixed(2)}\n\nLet me know if you'd like to proceed or have any questions. We can hold this rate for 48 hours. ✨`,
    },
    {
      key: "deposit",
      label: "Deposit reminder",
      msg: `Hi ${first}! Just a friendly reminder to confirm your *${pkg}* trip on ${start}, please complete the deposit payment at your earliest convenience. Reply here if you need the payment link again. 🙏`,
    },
    {
      key: "balance",
      label: "Balance due",
      msg: `Hi ${first}! Your *${pkg}* departure on ${start} is coming up soon. Kindly clear the outstanding balance so we can finalize all arrangements. Thank you! 🌌`,
    },
    {
      key: "predep",
      label: "Pre-departure info",
      msg: `Hi ${first}! Your *${pkg}* adventure starts on ${start} — we can't wait! 🎉\n\nA quick pre-departure checklist:\n• Passport valid 6+ months\n• Warm layers & thermals\n• Travel insurance copy\n• Pickup details will follow separately\n\nSafe travels! ❄️`,
    },
    {
      key: "review",
      label: "Post-trip thank you",
      msg: `Hi ${first}! It was a pleasure hosting you on *${pkg}*. 🙌 If you enjoyed the experience, a quick Google review would mean the world to our small team. Hope to see you again in Finland!`,
    },
  ];

  function send(msg: string) {
    if (!phone) return toast.error("No phone number on this customer");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Send className="size-5" /> WhatsApp templates</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!phone && <p className="text-xs text-destructive">Add a phone number to the customer to enable one-click WhatsApp send.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.key} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{t.label}</div>
                <Button size="sm" variant="secondary" disabled={!phone} onClick={() => send(t.msg)}>
                  <Send className="size-3" /> Send
                </Button>
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">{t.msg}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

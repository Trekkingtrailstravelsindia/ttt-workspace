import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileDown, ArrowLeft, Save, ClipboardList, Wand2, MapPin, Sparkles, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  type ActivitySheet, type ActivityRow,
  blankSheet, newRow, sheetFromTracker, toBook, bookedCount, activeCount,
  listSheets, saveSheet, deleteSheet, storageMode, generateFromBookings, bySoonest,
  enrichFromBookings, sortRowsByDate,
} from "@/lib/activity-tracker";
import { CURRENCIES, fmtDate, money } from "@/lib/booking-tracker";

export const Route = createFileRoute("/_authenticated/activity-tracker")({ component: ActivityTrackerPage });

function ActivityTrackerPage() {
  const [sheets, setSheets] = useState<ActivitySheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActivitySheet | null>(null);
  const [mode, setMode] = useState<"supabase" | "local">("local");
  const [generating, setGenerating] = useState(false);

  async function refresh() {
    setLoading(true);
    const [list, m] = await Promise.all([listSheets(), storageMode()]);
    setSheets(list.sort(bySoonest)); setMode(m); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      const { created, skipped } = await generateFromBookings();
      if (created === 0) toast.info(skipped ? "All bookings already have a sheet" : "No bookings found to generate from");
      else toast.success(`Created ${created} sheet${created > 1 ? "s" : ""}${skipped ? ` · ${skipped} already existed` : ""}`);
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Generate failed"); }
    finally { setGenerating(false); }
  }

  if (active) {
    return <SheetEditor sheet={active} mode={mode} onBack={() => { setActive(null); refresh(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Activity Tracker</h1>
          <p className="text-muted-foreground">
            Per-guest booking checklist — what to book and where. Auto-fills from a Booking Data &amp; Tracker sheet.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generate} disabled={generating}>
            <Sparkles className="size-4" /> {generating ? "Generating…" : "Generate from bookings"}
          </Button>
          <Button onClick={() => setActive(blankSheet())}>
            <Plus className="size-4" /> New sheet
          </Button>
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        <b>Generate from bookings</b> makes one sheet per booking (soonest trip first) and skips any already created.
      </p>

      {mode === "local" && (
        <p className="text-xs text-muted-foreground">
          Saved in this browser (shared database table not set up yet — the ops team will see sheets once the
          <code className="mx-1">activity_trackers</code> migration is applied).
        </p>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : sheets.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          No activity sheets yet. Click <b>New sheet</b> to start one, then auto-fill it from a booking.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {sheets.map((s) => {
              const total = activeCount(s), done = bookedCount(s);
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <button key={s.id} type="button" onClick={() => setActive(structuredClone(s))}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50">
                  <ClipboardList className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{s.guest_name || "Untitled guest"}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.package_name || "No package"}</div>
                  </div>
                  {s.travel_date && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                      <CalendarDays className="size-3.5" /> {fmtDate(s.travel_date)}
                    </span>
                  )}
                  <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-muted sm:block">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <Badge variant={done === total && total > 0 ? "default" : "secondary"} className="shrink-0">
                    {done}/{total} booked
                  </Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SheetEditor({ sheet, mode, onBack }: { sheet: ActivitySheet; mode: "supabase" | "local"; onBack: () => void }) {
  const [s, setS] = useState<ActivitySheet>(sheet);
  const [saving, setSaving] = useState(false);
  const [trackers, setTrackers] = useState<{ id: string; label: string }[]>([]);

  // Lazy-load the booking trackers for the auto-fill dropdown.
  useEffect(() => {
    (async () => {
      try {
        const { listTrackers } = await import("@/lib/booking-tracker-store");
        const list = await listTrackers();
        setTrackers(list.map((t) => ({ id: t.id, label: `${t.customer_name || "Booking"} — ${t.package_name || t.title}` })));
      } catch { /* trackers optional */ }
    })();
  }, []);

  const pending = useMemo(() => toBook(s), [s]);

  function patch(p: Partial<ActivitySheet>) { setS((prev) => ({ ...prev, ...p })); }
  function patchRow(id: string, p: Partial<ActivityRow>) {
    setS((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  }
  function addRow() { setS((prev) => ({ ...prev, rows: [...prev.rows, newRow()] })); }
  function removeRow(id: string) { setS((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) })); }

  async function autofill(trackerId: string) {
    try {
      const { listTrackers } = await import("@/lib/booking-tracker-store");
      const list = await listTrackers();
      const t = list.find((x) => x.id === trackerId);
      if (!t) { toast.error("Booking not found"); return; }
      const filled = await enrichFromBookings(sheetFromTracker(t));
      filled.id = s.id; // keep editing the same sheet
      setS(filled);
      toast.success(`Auto-filled from ${t.customer_name || "booking"}`);
    } catch (e: any) { toast.error(e?.message || "Auto-fill failed"); }
  }

  async function save() {
    if (!s.guest_name.trim()) { toast.error("Enter a guest name first"); return; }
    setSaving(true);
    try { await saveSheet(s); toast.success("Saved"); }
    catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  }
  async function saveAndDownload() {
    await save();
    downloadSheet(s);
  }
  async function remove() {
    if (!confirm("Delete this activity sheet?")) return;
    await deleteSheet(s.id);
    toast.success("Deleted");
    onBack();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-4" /> All sheets</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadSheet(s)}><FileDown className="size-4" /> Download</Button>
          <Button variant="outline" onClick={remove}><Trash2 className="size-4" /> Delete</Button>
          <Button onClick={saveAndDownload} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : "Save & download"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Guest & package</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Guest name</label>
            <Input value={s.guest_name} onChange={(e) => patch({ guest_name: e.target.value })} placeholder="e.g. Sharma family (4 pax)" />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Package</label>
            <Input value={s.package_name} onChange={(e) => patch({ package_name: e.target.value })} placeholder="e.g. 9-day Finland" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Currency</label>
            <Select value={s.currency} onValueChange={(v) => patch({ currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Travel start date</label>
            <Input type="date" value={s.travel_date ?? ""} onChange={(e) => patch({ travel_date: e.target.value || null })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Start time</label>
            <Input type="time" value={s.start_time ?? ""} onChange={(e) => patch({ start_time: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Travel end date</label>
            <Input type="date" value={s.end_date ?? ""} onChange={(e) => patch({ end_date: e.target.value || null })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">End time</label>
            <Input type="time" value={s.end_time ?? ""} onChange={(e) => patch({ end_time: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Adults</label>
            <Input type="number" min={0} value={s.adults ?? 0} onChange={(e) => patch({ adults: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Kids</label>
            <Input type="number" min={0} value={s.kids ?? 0} onChange={(e) => patch({ kids: Number(e.target.value) || 0 })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact number</label>
            <Input value={s.contact ?? ""} onChange={(e) => patch({ contact: e.target.value })} placeholder="e.g. +358 40 123 4567" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Booking number</label>
            <Input value={s.booking_no ?? ""} onChange={(e) => patch({ booking_no: e.target.value })} placeholder="e.g. TTT-2026-001" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Invoice number</label>
            <Input value={s.invoice_no ?? ""} onChange={(e) => patch({ invoice_no: e.target.value })} placeholder="e.g. INV-2026-001" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Package cost ({s.currency})</label>
            <Input type="number" min={0} step="0.01" value={s.package_cost ?? 0} onChange={(e) => patch({ package_cost: Number(e.target.value) || 0 })} />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              <Wand2 className="mr-1 inline size-3.5" /> Auto-fill from a booking
            </label>
            <Select onValueChange={autofill}>
              <SelectTrigger><SelectValue placeholder={trackers.length ? "Pick a Booking Data & Tracker sheet…" : "No bookings found"} /></SelectTrigger>
              <SelectContent>{trackers.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Pulls guest, travel dates, pax, package cost, plus each activity's dates, times, suppliers, cost and booked/paid status. You can still edit every field.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* What to book & where */}
      <Card className={pending.length ? "border-amber-400/60" : "border-emerald-400/60"}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            {pending.length ? `Still to book — ${pending.length} item${pending.length > 1 ? "s" : ""}` : "Everything is booked 🎉"}
          </CardTitle>
        </CardHeader>
        {pending.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {pending.map((r) => (
              <span key={r.id} className="rounded-md border border-amber-400/50 bg-amber-50 px-2.5 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <b>{r.activity}</b>
                {r.location && <> · {r.location}</>}
                {r.dates && <> · {r.dates}</>}
                {r.supplier && <> · {r.supplier}</>}
              </span>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Editable table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Activity name</th>
                <th className="px-3 py-2 font-medium">Dates</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Supplier name</th>
                <th className="px-3 py-2 text-center font-medium">Booked</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 text-center font-medium">Paid</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-middle">
                  <td className="px-2 py-1"><Input className="h-8 border-transparent bg-transparent hover:border-input focus:border-input" value={r.activity} onChange={(e) => patchRow(r.id, { activity: e.target.value })} /></td>
                  <td className="px-2 py-1"><Input className="h-8 border-transparent bg-transparent hover:border-input focus:border-input" value={r.dates} onChange={(e) => patchRow(r.id, { dates: e.target.value })} placeholder="—" /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-28 border-transparent bg-transparent hover:border-input focus:border-input" value={r.time} onChange={(e) => patchRow(r.id, { time: e.target.value })} placeholder="—" /></td>
                  <td className="px-2 py-1"><Input className="h-8 border-transparent bg-transparent hover:border-input focus:border-input" value={r.supplier} onChange={(e) => patchRow(r.id, { supplier: e.target.value })} placeholder="—" /></td>
                  <td className="px-2 py-1 text-center"><YesNo value={r.booked} onChange={(v) => patchRow(r.id, { booked: v })} /></td>
                  <td className="px-2 py-1"><Input className="h-8 w-28 border-transparent bg-transparent hover:border-input focus:border-input" value={r.cost} onChange={(e) => patchRow(r.id, { cost: e.target.value })} placeholder="—" /></td>
                  <td className="px-2 py-1 text-center"><YesNo value={r.paid} onChange={(v) => patchRow(r.id, { paid: v })} /></td>
                  <td className="px-2 py-1 text-right">
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(r.id)}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Add activity</Button>
          <Button variant="outline" size="sm" onClick={() => setS((prev) => ({ ...prev, rows: sortRowsByDate(prev.rows) }))}>
            <CalendarDays className="size-4" /> Sort by date
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{bookedCount(s)} of {activeCount(s)} booked</span>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea value={s.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Operational notes for this guest…" rows={3} />
      </div>
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={
        "inline-flex min-w-[48px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition-colors " +
        (value
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-muted text-muted-foreground hover:bg-muted/70")
      }
    >
      {value ? "Yes" : "No"}
    </button>
  );
}

// Printable PDF — opens a styled sheet in a new window and triggers print,
// matching the Booking Data & Tracker download flow.
function downloadSheet(s: ActivitySheet) {
  const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const rows = s.rows
    .filter((r) => r.activity.trim())
    .map((r) => `
      <tr>
        <td><b>${esc(r.activity)}</b></td>
        <td>${esc(r.dates || "—")}</td>
        <td class="c">${esc(r.time || "—")}</td>
        <td>${esc(r.supplier || "—")}</td>
        <td class="c">${r.booked ? "✔ Yes" : "No"}</td>
        <td class="r">${esc(r.cost || "—")}</td>
        <td class="c">${r.paid ? "✔ Yes" : "No"}</td>
      </tr>`).join("");

  const start = s.travel_date ? `${fmtDate(s.travel_date)}${s.start_time ? ` · ${s.start_time}` : ""}` : "—";
  const end = s.end_date ? `${fmtDate(s.end_date)}${s.end_time ? ` · ${s.end_time}` : ""}` : "—";
  const pax = `${s.adults || 0} adult${(s.adults || 0) === 1 ? "" : "s"}${s.kids ? `, ${s.kids} kid${s.kids === 1 ? "" : "s"}` : ""}`;
  const metaCells: [string, string][] = [
    ["Travel start", start],
    ["Travel end", end],
    ["Guests", pax],
    ["Contact number", s.contact || "—"],
    ["Booking number", s.booking_no || "—"],
    ["Invoice number", s.invoice_no || "—"],
    ["Package cost", s.package_cost ? money(s.package_cost, s.currency) : "—"],
  ];
  const metaHtml = `<div class="meta">${metaCells
    .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>`;

  const pending = toBook(s);
  const pendingHtml = pending.length
    ? `<h2>Still to book (${pending.length})</h2><ul class="tb">${pending.map((r) =>
        `<li><b>${esc(r.activity)}</b>${r.location ? ` — ${esc(r.location)}` : ""}${r.dates ? ` · ${esc(r.dates)}` : ""}${r.supplier ? ` · ${esc(r.supplier)}` : ""}</li>`).join("")}</ul>`
    : `<p class="allbooked">✔ All activities are booked.</p>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.guest_name || "Activity tracker")} — Activity Tracker</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1a2332; margin:26px; font-size:12px; }
    .head { background:#F6D568; border-radius:8px; padding:12px 16px; margin-bottom:16px; }
    .head h1 { margin:0; font-size:18px; color:#1a2332; }
    .head p { margin:2px 0 0; font-size:12px; color:#3a3320; }
    .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:8px 20px; border:1px solid #d9e0ea; border-radius:8px; padding:12px 16px; margin-bottom:16px; }
    .meta span { display:block; color:#6b7a90; font-size:9px; text-transform:uppercase; letter-spacing:.04em; }
    .meta b { font-size:12px; }
    h2 { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#0f2847; border-bottom:2px solid #0f2847; padding-bottom:4px; margin:20px 0 8px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#0f2847; color:#fff; text-align:left; padding:6px 8px; font-size:10px; text-transform:uppercase; }
    td { border:1px solid #e2e8f0; padding:6px 8px; vertical-align:top; }
    tr:nth-child(even) td { background:#fafbfc; }
    .c { text-align:center; } .r { text-align:right; white-space:nowrap; }
    ul.tb { margin:0; padding-left:18px; } ul.tb li { margin:2px 0; }
    .allbooked { color:#15803d; font-weight:600; }
    .foot { margin-top:22px; color:#6b7a90; font-size:9.5px; border-top:1px solid #e2e8f0; padding-top:8px; }
    @media print { body { margin:10mm; } }
  </style></head><body>
    <div class="head">
      <h1>${esc(s.guest_name || "Guest")}</h1>
      <p>${esc(s.package_name || "Package")}</p>
    </div>
    ${metaHtml}
    <table>
      <thead><tr><th>Activity name</th><th>Dates</th><th>Time</th><th>Supplier name</th><th>Booked</th><th>Cost</th><th>Paid</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="c">No activities</td></tr>'}</tbody>
    </table>
    ${pendingHtml}
    ${s.notes ? `<h2>Notes</h2><p>${esc(s.notes).replace(/\n/g, "<br>")}</p>` : ""}
    <p class="foot">Generated ${new Date().toLocaleString("en-GB")} · Trekking Trails Travels · Info@Trekkingtrailstravels.com · +358 4656 30404</p>
    <script>window.onload = () => { window.print(); };<\/script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { toast.error("Allow pop-ups to download the sheet"); return; }
  w.document.write(html); w.document.close();
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Building2, Users, Clock, Phone, X, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, getCompany } from "@/lib/companies";

type Booking = {
  id: string; start_date: string; end_date: string | null; start_time?: string | null; status: string;
  travelers?: number | null; kids?: number | null;
  company?: string | null;
  customer?: { name: string; phone?: string | null } | null; package?: { name: string } | null;
};

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["calendar-bookings"],
    queryFn: async () => {
      const r = await supabase.from("bookings").select("id,start_date,end_date,start_time,status,travelers,company,customer:customers(name,phone),package:tour_packages(name)");
      if (r.error) {
        // Fall back if the `company` / `start_time` columns aren't in the DB yet.
        const r2 = await supabase.from("bookings").select("id,start_date,end_date,status,travelers,customer:customers(name,phone),package:tour_packages(name)");
        return (r2.data as unknown as Booking[]) ?? [];
      }
      return (r.data as unknown as Booking[]) ?? [];
    },
  });

  const all = data ?? [];
  const filtered = useMemo(
    () => companyFilter === "all" ? all : all.filter(b => getCompany(b.company).id === companyFilter),
    [all, companyFilter],
  );

  // Which companies actually have bookings (for the filter bar).
  const companyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of all) m.set(getCompany(b.company).id, (m.get(getCompany(b.company).id) ?? 0) + 1);
    return m;
  }, [all]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon start
    const days = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  function localIso(date: Date) {
    // Avoid UTC shift from toISOString().
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function bookingsOn(date: Date) {
    const iso = localIso(date);
    return filtered.filter((b) => {
      const s = b.start_date; const e = b.end_date ?? b.start_date;
      return iso >= s && iso <= e;
    });
  }

  // Count of bookings in the currently shown month (respecting the filter).
  const monthCount = useMemo(() => {
    const y = cursor.getFullYear(); const m = cursor.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-31`;
    return filtered.filter(b => {
      const s = b.start_date; const e = b.end_date ?? b.start_date;
      return s <= end && e >= start;
    }).length;
  }, [filtered, cursor]);

  const monthName = cursor.toLocaleString("en", { month: "long", year: "numeric" });
  const today = localIso(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Calendar</h1>
          <p className="text-muted-foreground">All departures at a glance — {monthCount} this month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <div className="min-w-[160px] text-center font-semibold">{monthName}</div>
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</Button>
        </div>
      </div>

      {/* Company filter — colour-coded */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCompanyFilter("all")}
          className={cn("rounded-full border px-3 py-1.5 text-sm transition",
            companyFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
        >
          All companies <span className="opacity-70">{all.length}</span>
        </button>
        {COMPANIES.filter(c => companyCounts.get(c.id)).map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCompanyFilter(c.id)}
            className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              companyFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
          >
            <span className="inline-block size-2.5 rounded-full" style={{ background: c.color }} />
            {c.name} <span className="opacity-70">{companyCounts.get(c.id)}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-32 rounded-lg bg-muted/20" />;
              const iso = localIso(d);
              const bs = bookingsOn(d);
              return (
                <div key={i} className={cn("flex min-h-32 flex-col rounded-lg border p-2 text-xs", iso === today && "border-primary bg-primary/5", iso === selectedDate && "ring-2 ring-primary")}>
                  <button type="button" onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                    className={cn("mb-1 self-start rounded px-1 text-sm font-semibold hover:bg-muted", iso === today && "text-primary")}
                    title="Show departure roster for this day">{d.getDate()}</button>
                  <div className="space-y-1">
                    {bs.slice(0, 5).map(b => {
                      const c = getCompany(b.company);
                      return (
                        <Link
                          key={b.id}
                          to="/bookings/$id" params={{ id: b.id }}
                          title={`${b.customer?.name ?? "Booking"} · ${c.name}${b.package?.name ? " · " + b.package.name : ""}`}
                          className="block rounded px-1.5 py-1 text-foreground hover:opacity-80"
                          style={{ background: `${c.color}22`, borderLeft: `3px solid ${c.color}` }}
                        >
                          <span className="block truncate font-medium">{b.start_time ? `${b.start_time} · ` : ""}{b.customer?.name ?? "Booking"}</span>
                          {b.package?.name && <span className="block truncate text-[10px] opacity-75">{b.package.name}</span>}
                        </Link>
                      );
                    })}
                    {bs.length > 5 && <div className="text-[10px] text-muted-foreground">+{bs.length - 5} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && <DepartureRoster date={selectedDate} bookings={bookingsOn(new Date(selectedDate + "T00:00:00"))} onClose={() => setSelectedDate(null)} />}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Building2 className="size-3.5" /> Colours by company:</span>
        {COMPANIES.filter(c => companyCounts.get(c.id)).map(c => (
          <span key={c.id} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: c.color }} />{c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function DepartureRoster({ date, bookings, onClose }: { date: string; bookings: Booking[]; onClose: () => void }) {
  const active = bookings.filter(b => b.status !== "cancelled");
  const totalPax = active.reduce((s, b) => s + (Number(b.travelers) || 0), 0);
  const pretty = new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sorted = [...active].sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));

  return (
    <Card className="border-primary/40">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" /> Departure roster · {pretty}
          <span className="text-sm font-normal text-muted-foreground">· {active.length} booking{active.length === 1 ? "" : "s"} · {totalPax} pax</span>
        </CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent>
        {!sorted.length ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No departures on this day.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Guest</th><th className="py-2 pr-3">Activity</th>
                  <th className="py-2 pr-3">Company</th><th className="py-2 pr-3">Pax</th><th className="py-2 pr-3">Phone</th><th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(b => {
                  const c = getCompany(b.company);
                  return (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{b.start_time ? <span className="flex items-center gap-1"><Clock className="size-3 text-muted-foreground" />{b.start_time}</span> : "—"}</td>
                      <td className="py-2 pr-3">
                        <Link to="/bookings/$id" params={{ id: b.id }} className="font-medium hover:underline">{b.customer?.name ?? "—"}</Link>
                      </td>
                      <td className="py-2 pr-3">{b.package?.name ?? "—"}</td>
                      <td className="py-2 pr-3"><span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span></td>
                      <td className="py-2 pr-3"><span className="flex items-center gap-1"><Users className="size-3 text-muted-foreground" />{b.travelers ?? 0}</span></td>
                      <td className="py-2 pr-3">{b.customer?.phone ? <a href={`tel:${b.customer.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="size-3" />{b.customer.phone}</a> : "—"}</td>
                      <td className="py-2"><Badge variant="secondary" className="capitalize">{b.status.replace("_", " ")}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

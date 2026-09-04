import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Calendar, Receipt, TrendingUp, Wallet, PiggyBank, Trophy, Building2, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentRole } from "@/hooks/use-current-role";
import { COMPANIES, getCompany } from "@/lib/companies";
import { QuickAddBooking } from "@/components/QuickAddBooking";
import { BalanceDue } from "@/components/BalanceDue";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { canSeeFinancials } = useCurrentRole();
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const { data: raw } = useQuery({
    queryKey: ["dashboard", canSeeFinancials],
    queryFn: async () => {
      const [customers, packages, recent, invoices, allBookings, expenses, payments] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("tour_packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("*, customer:customers(name), package:tour_packages(name)").order("created_at", { ascending: false }).limit(30),
        canSeeFinancials ? supabase.from("invoices").select("total, status, company") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials
          ? supabase.from("bookings").select("id, total_amount, company, status").then(async (r) =>
              // Fall back if the `company` column hasn't been added to the DB yet.
              r.error ? await supabase.from("bookings").select("id, total_amount, status") : r)
          : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("booking_expenses").select("amount, booking_id") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("booking_installments").select("booking_id, amount, paid, due_date") : Promise.resolve({ data: [] as any[] }),
      ]);
      return {
        customers: customers.count ?? 0,
        packages: packages.count ?? 0,
        recent: (recent.data ?? []) as any[],
        invoices: (invoices.data ?? []) as any[],
        allBookings: (allBookings.data ?? []) as any[],
        expenses: (expenses.data ?? []) as any[],
        payments: (payments.data ?? []) as any[],
      };
    },
  });

  // Bookings with dates for the embedded calendar (shares the Calendar page's cache).
  const { data: calBookings } = useQuery({
    queryKey: ["calendar-bookings"],
    queryFn: async () => {
      const r = await supabase.from("bookings").select("id,start_date,end_date,start_time,status,company,customer:customers(name),package:tour_packages(name)");
      if (r.error) {
        const r2 = await supabase.from("bookings").select("id,start_date,end_date,status,customer:customers(name),package:tour_packages(name)");
        return (r2.data as any[]) ?? [];
      }
      return (r.data as any[]) ?? [];
    },
  });
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  // Which companies actually appear (for the filter bar) + leaderboard (always all companies).
  const companySales = useMemo(() => {
    const byCompany = new Map<string, { id: string; sales: number; count: number; won: number; received: number; due: number }>();
    const ensure = (id: string) => {
      const row = byCompany.get(id) ?? { id, sales: 0, count: 0, won: 0, received: 0, due: 0 };
      byCompany.set(id, row); return row;
    };
    const bookingCompany = new Map<string, string>();
    for (const b of (raw?.allBookings ?? [])) bookingCompany.set(b.id, getCompany(b.company).id);
    for (const b of (raw?.allBookings ?? [])) {
      const row = ensure(getCompany(b.company).id);
      row.count += 1;
      if (b.status !== "cancelled") row.sales += Number(b.total_amount) || 0;
      if (["confirmed","travelling","completed","deposit_paid"].includes(b.status)) row.won += 1;
    }
    for (const p of (raw?.payments ?? [])) {
      const row = ensure(bookingCompany.get(p.booking_id) || "ttt-dmc");
      if (p.paid) row.received += Number(p.amount) || 0;
      else row.due += Number(p.amount) || 0;
    }
    return [...byCompany.values()].sort((a, b) => b.sales - a.sales);
  }, [raw]);

  // Finance stats + recent bookings, scoped to the selected company.
  const data = useMemo(() => {
    const inScope = (companyId?: string | null) => companyFilter === "all" || getCompany(companyId).id === companyFilter;
    const bookingCompany = new Map<string, string>();
    for (const b of (raw?.allBookings ?? [])) bookingCompany.set(b.id, getCompany(b.company).id);
    const payInScope = (bookingId: string) => companyFilter === "all" || (bookingCompany.get(bookingId) === companyFilter);

    const invoices = (raw?.invoices ?? []).filter((i: any) => inScope(i.company));
    const bookings = (raw?.allBookings ?? []).filter((b: any) => inScope(b.company));
    const expenses = (raw?.expenses ?? []).filter((e: any) => !e.booking_id || payInScope(e.booking_id));
    const payments = (raw?.payments ?? []).filter((p: any) => payInScope(p.booking_id));

    const revenue = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
    const outstanding = invoices.filter((i: any) => ["sent","overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0);
    const bookingSales = bookings.reduce((s: number, b: any) => s + Number(b.total_amount), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const profit = bookingSales - totalExpenses;
    const totalReceived = payments.filter((p: any) => p.paid).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const totalDue = payments.filter((p: any) => !p.paid).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const horizon = in30.toISOString().slice(0, 10);
    const dueSoon = payments.filter((p: any) => !p.paid && p.due_date && p.due_date <= horizon).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

    const recent = (raw?.recent ?? []).filter((b: any) => inScope(b.company)).slice(0, 6);

    return {
      customers: raw?.customers ?? 0,
      packages: raw?.packages ?? 0,
      bookings: recent,
      revenue, outstanding, bookingSales, totalExpenses, profit,
      totalReceived, totalDue, dueSoon,
      companySales,
    };
  }, [raw, companyFilter, companySales]);

  const baseStats = [
    { label: "Customers", value: data?.customers ?? 0, icon: Users, to: "/customers" as const },
    { label: "Packages", value: data?.packages ?? 0, icon: Package, to: "/packages" as const },
  ];
  const financeStats = [
    { label: "Booking sales", value: `€${(data?.bookingSales ?? 0).toFixed(0)}`, icon: TrendingUp, to: "/bookings" as const },
    { label: "Total expenses", value: `€${(data?.totalExpenses ?? 0).toFixed(0)}`, icon: Wallet, to: "/bookings" as const },
    { label: (data?.profit ?? 0) >= 0 ? "Profit" : "Loss", value: `€${Math.abs(data?.profit ?? 0).toFixed(0)}`, icon: PiggyBank, to: "/bookings" as const },
    { label: "Payments received", value: `€${(data?.totalReceived ?? 0).toFixed(0)}`, icon: PiggyBank, to: "/bookings" as const },
    { label: "Payments due", value: `€${(data?.totalDue ?? 0).toFixed(0)}`, icon: Wallet, to: "/bookings" as const },
    { label: "Coming in (30 days)", value: `€${(data?.dueSoon ?? 0).toFixed(0)}`, icon: CalendarClock, to: "/bookings" as const },
    { label: "Revenue (paid)", value: `€${(data?.revenue ?? 0).toFixed(0)}`, icon: TrendingUp, to: "/invoices" as const },
    { label: "Outstanding", value: `€${(data?.outstanding ?? 0).toFixed(0)}`, icon: Receipt, to: "/invoices" as const },
  ];
  const stats = canSeeFinancials ? [...baseStats, ...financeStats] : baseStats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-primary">Dashboard</h1>
        <p className="text-muted-foreground">
          Your Finland tour business at a glance
          {companyFilter !== "all" && <> — <span className="font-medium text-foreground">{getCompany(companyFilter).name}</span></>}.
        </p>
      </div>

      {/* Company filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCompanyFilter("all")}
          className={cn("rounded-full border px-3 py-1.5 text-sm transition",
            companyFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
        >
          All companies
        </button>
        {COMPANIES.filter(c => companySales.find(r => r.id === c.id && r.count > 0)).map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCompanyFilter(c.id)}
            className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              companyFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}
          >
            <span className="inline-block size-2.5 rounded-full" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="transition-shadow hover:shadow-soft">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{s.value}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {canSeeFinancials && (data?.companySales?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary" /> Sales by company</CardTitle>
            <Link to="/bookings" className="text-sm text-primary hover:underline">All bookings</Link>
          </CardHeader>
          <CardContent>
            {(() => {
              const rows = data!.companySales;
              const max = Math.max(...rows.map(r => r.sales), 1);
              return (
                <div className="space-y-4">
                  {rows.map((r, i) => {
                    const c = getCompany(r.id);
                    const pct = Math.round((r.sales / max) * 100);
                    return (
                      <div key={r.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-medium">
                            {i === 0
                              ? <Trophy className="size-4 shrink-0 text-amber-500" />
                              : <Building2 className="size-4 shrink-0 text-muted-foreground" />}
                            <span className="truncate">{c.name}</span>
                            {i === 0 && <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Top seller</Badge>}
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-primary">€{r.sales.toFixed(0)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${i === 0 ? "bg-amber-500" : "bg-primary/70"}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.count} booking{r.count === 1 ? "" : "s"} · {r.won} won
                          {(r.received > 0 || r.due > 0) && <> · <span className="text-success">€{r.received.toFixed(0)} received</span>{r.due > 0 && <> · <span className="text-destructive">€{r.due.toFixed(0)} due</span></>}</>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      <QuickAddBooking company={companyFilter === "all" ? undefined : companyFilter} />

      {canSeeFinancials && <BalanceDue companyFilter={companyFilter} />}

      <DashboardCalendar
        bookings={(calBookings ?? []).filter((b: any) => companyFilter === "all" || getCompany(b.company).id === companyFilter)}
        cursor={calCursor}
        onPrev={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1))}
        onNext={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1))}
        onToday={() => { const d = new Date(); d.setDate(1); setCalCursor(d); }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> Recent bookings</CardTitle>
          <Link to="/bookings" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {!data?.bookings.length ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</div>
          ) : (
            <div className="divide-y">
              {data.bookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <div className="font-medium">{b.customer?.name}</div>
                    <div className="text-sm text-muted-foreground">{b.package?.name} · {b.start_date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={b.status} />
                    <span className="font-medium">€{Number(b.total_amount).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardCalendar({ bookings, cursor, onPrev, onNext, onToday }: {
  bookings: any[];
  cursor: Date;
  onPrev: () => void; onNext: () => void; onToday: () => void;
}) {
  const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cells = useMemo(() => {
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon start
    const days = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  const bookingsOn = (date: Date) => {
    const iso = localIso(date);
    return bookings.filter((b) => { const s = b.start_date; const e = b.end_date ?? b.start_date; return iso >= s && iso <= e; });
  };
  const monthName = cursor.toLocaleString("en", { month: "long", year: "numeric" });
  const today = localIso(new Date());
  const monthCount = useMemo(() => {
    const y = cursor.getFullYear(); const m = cursor.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-31`;
    return bookings.filter(b => { const s = b.start_date; const e = b.end_date ?? b.start_date; return s <= end && e >= start; }).length;
  }, [bookings, cursor]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" /> Bookings calendar
          <span className="text-sm font-normal text-muted-foreground">· {monthCount} in {monthName}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={onPrev}><ChevronLeft className="size-4" /></Button>
          <div className="min-w-[140px] text-center text-sm font-semibold">{monthName}</div>
          <Button size="icon" variant="outline" onClick={onNext}><ChevronRight className="size-4" /></Button>
          <Button size="sm" variant="outline" onClick={onToday}>Today</Button>
          <Link to="/calendar" className="text-sm text-primary hover:underline">Full calendar</Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="py-1.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="min-h-24 rounded-lg bg-muted/20" />;
            const iso = localIso(d);
            const bs = bookingsOn(d);
            return (
              <div key={i} className={cn("flex min-h-24 flex-col rounded-lg border p-1.5 text-xs", iso === today && "border-primary bg-primary/5")}>
                <div className={cn("mb-1 text-sm font-semibold", iso === today && "text-primary")}>{d.getDate()}</div>
                <div className="space-y-1">
                  {bs.slice(0, 4).map((b) => {
                    const c = getCompany(b.company);
                    return (
                      <Link
                        key={b.id}
                        to="/bookings/$id" params={{ id: b.id }}
                        title={`${b.customer?.name ?? "Booking"} · ${c.name}${b.package?.name ? " · " + b.package.name : ""}`}
                        className="block rounded px-1.5 py-0.5 text-foreground hover:opacity-80"
                        style={{ background: `${c.color}22`, borderLeft: `3px solid ${c.color}` }}
                      >
                        <span className="block truncate font-medium">{b.start_time ? `${b.start_time} · ` : ""}{b.customer?.name ?? "Booking"}</span>
                        {b.package?.name && <span className="block truncate text-[10px] opacity-75">{b.package.name}</span>}
                      </Link>
                    );
                  })}
                  {bs.length > 4 && <div className="text-[10px] text-muted-foreground">+{bs.length - 4} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    inquiry: "bg-muted text-muted-foreground",
    confirmed: "bg-accent text-accent-foreground",
    completed: "bg-success text-success-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <Badge className={map[status] ?? ""} variant="secondary">{status}</Badge>;
}

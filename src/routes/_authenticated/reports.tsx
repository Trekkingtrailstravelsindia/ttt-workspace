import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [bookingsRes, expensesRes, invoicesRes, customersRes] = await Promise.all([
        supabase.from("bookings").select("id,start_date,total_amount,package_id,customer_id,package:tour_packages(name)"),
        supabase.from("booking_expenses").select("booking_id,amount"),
        supabase.from("invoices").select("issue_date,total,status"),
        supabase.from("customers").select("id,name,lead_source,lost_reason,stage"),
      ]);
      return {
        bookings: (bookingsRes.data ?? []) as any[],
        expenses: (expensesRes.data ?? []) as any[],
        invoices: (invoicesRes.data ?? []) as any[],
        customers: (customersRes.data ?? []) as any[],
      };
    },
  });

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      const key = d.toISOString().slice(0, 7);
      map.set(key, { month: d.toLocaleString("en", { month: "short" }), revenue: 0, expenses: 0, profit: 0 });
    }
    const expByBooking = new Map<string, number>();
    (data?.expenses ?? []).forEach((e) => expByBooking.set(e.booking_id, (expByBooking.get(e.booking_id) ?? 0) + Number(e.amount)));
    (data?.bookings ?? []).forEach((b) => {
      const key = (b.start_date ?? "").slice(0, 7);
      const row = map.get(key); if (!row) return;
      row.revenue += Number(b.total_amount);
      row.expenses += expByBooking.get(b.id) ?? 0;
      row.profit = row.revenue - row.expenses;
    });
    return Array.from(map.values());
  }, [data]);

  const topPackages = useMemo(() => {
    const m = new Map<string, { name: string; sales: number; profit: number }>();
    const expByBooking = new Map<string, number>();
    (data?.expenses ?? []).forEach((e) => expByBooking.set(e.booking_id, (expByBooking.get(e.booking_id) ?? 0) + Number(e.amount)));
    (data?.bookings ?? []).forEach((b) => {
      const name = b.package?.name ?? "Unknown";
      const row = m.get(name) ?? { name, sales: 0, profit: 0 };
      row.sales += Number(b.total_amount);
      row.profit += Number(b.total_amount) - (expByBooking.get(b.id) ?? 0);
      m.set(name, row);
    });
    return Array.from(m.values()).sort((a, b) => b.sales - a.sales).slice(0, 6);
  }, [data]);

  const invoiceTotal = (data?.invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
  const paid = (data?.invoices ?? []).filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);

  // Season heatmap: bookings count per month per year (12 months x years present)
  const heatmap = useMemo(() => {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const years = new Set<number>();
    const cell = new Map<string, { count: number; revenue: number }>();
    (data?.bookings ?? []).forEach(b => {
      if (!b.start_date) return;
      const d = new Date(b.start_date);
      const y = d.getFullYear(); const m = d.getMonth();
      years.add(y);
      const k = `${y}-${m}`;
      const row = cell.get(k) ?? { count: 0, revenue: 0 };
      row.count += 1; row.revenue += Number(b.total_amount);
      cell.set(k, row);
    });
    const sortedYears = Array.from(years).sort();
    const max = Math.max(1, ...Array.from(cell.values()).map(v => v.count));
    return { months: MONTHS, years: sortedYears, cell, max };
  }, [data]);

  // Lead source ROI: source -> leads count, conversion rate, revenue
  const sourceROI = useMemo(() => {
    const custBy = new Map<string, any>();
    (data?.customers ?? []).forEach(c => custBy.set(c.id, c));
    const revBySource = new Map<string, number>();
    (data?.bookings ?? []).forEach(b => {
      const src = custBy.get(b.customer_id)?.lead_source ?? "Unknown";
      revBySource.set(src, (revBySource.get(src) ?? 0) + Number(b.total_amount));
    });
    const m = new Map<string, { source: string; leads: number; converted: number; revenue: number }>();
    (data?.customers ?? []).forEach(c => {
      const src = c.lead_source ?? "Unknown";
      const row = m.get(src) ?? { source: src, leads: 0, converted: 0, revenue: 0 };
      row.leads += 1;
      if (c.stage === "confirmed" || c.stage === "completed") row.converted += 1;
      m.set(src, row);
    });
    m.forEach((row, src) => { row.revenue = revBySource.get(src) ?? 0; });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // Guest lifetime value: per-customer total booking spend, trip count, repeat flag.
  const guestLTV = useMemo(() => {
    const nameBy = new Map<string, string>();
    (data?.customers ?? []).forEach(c => nameBy.set(c.id, c.name ?? "Guest"));
    const m = new Map<string, { id: string; name: string; trips: number; total: number }>();
    (data?.bookings ?? []).forEach(b => {
      if (!b.customer_id) return;
      const row = m.get(b.customer_id) ?? { id: b.customer_id, name: nameBy.get(b.customer_id) ?? "Guest", trips: 0, total: 0 };
      row.trips += 1;
      row.total += Number(b.total_amount);
      m.set(b.customer_id, row);
    });
    const guests = Array.from(m.values()).sort((a, b) => b.total - a.total);
    const withBooking = guests.length;
    const repeat = guests.filter(g => g.trips > 1).length;
    const avg = withBooking ? guests.reduce((s, g) => s + g.total, 0) / withBooking : 0;
    return { top: guests.slice(0, 8), withBooking, repeat, repeatRate: withBooking ? (repeat / withBooking) * 100 : 0, avg };
  }, [data]);

  const lostReasons = useMemo(() => {
    const m = new Map<string, number>();
    (data?.customers ?? []).filter(c => c.stage === "lost").forEach(c => {
      const r = (c.lost_reason ?? "").trim() || "No reason given";
      m.set(r, (m.get(r) ?? 0) + 1);
    });
    return Array.from(m.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [data]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary">Reports</h1>
        <p className="text-muted-foreground">Sales, expenses & profit over time.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Invoiced total" value={`€${invoiceTotal.toFixed(0)}`} />
        <StatCard label="Collected (paid)" value={`€${paid.toFixed(0)}`} />
        <StatCard label="Collection rate" value={invoiceTotal ? `${((paid / invoiceTotal) * 100).toFixed(0)}%` : "—"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue vs expenses (last 6 months)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top packages by sales</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPackages}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="sales" fill="hsl(var(--primary))" />
              <Bar dataKey="profit" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Season heatmap — bookings by month</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {!heatmap.years.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-muted-foreground">Year</th>
                  {heatmap.months.map(m => <th key={m} className="p-2 text-center font-medium text-muted-foreground">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.years.map(y => (
                  <tr key={y}>
                    <td className="p-2 font-semibold">{y}</td>
                    {heatmap.months.map((_, mi) => {
                      const v = heatmap.cell.get(`${y}-${mi}`);
                      const intensity = v ? Math.max(0.15, v.count / heatmap.max) : 0;
                      return (
                        <td key={mi} className="p-1">
                          <div
                            className="mx-auto flex h-10 w-full min-w-[36px] items-center justify-center rounded"
                            style={{ backgroundColor: v ? `hsl(var(--primary) / ${intensity})` : "hsl(var(--muted))" }}
                            title={v ? `${v.count} booking(s) · €${v.revenue.toFixed(0)}` : "—"}
                          >
                            <span className={v && intensity > 0.5 ? "font-semibold text-primary-foreground" : "text-foreground"}>{v?.count ?? ""}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guest lifetime value</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Guests with bookings" value={String(guestLTV.withBooking)} />
            <StatCard label="Repeat guests" value={`${guestLTV.repeat} · ${guestLTV.repeatRate.toFixed(0)}%`} />
            <StatCard label="Avg lifetime value" value={`€${guestLTV.avg.toFixed(0)}`} />
          </div>
          {!guestLTV.top.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet — guest value appears once bookings are logged.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="py-2 text-left">Guest</th>
                  <th className="py-2 text-right">Trips</th>
                  <th className="py-2 text-right">Lifetime value</th>
                </tr>
              </thead>
              <tbody>
                {guestLTV.top.map(g => (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="py-2">{g.name}{g.trips > 1 && <Badge variant="secondary" className="ml-2">Repeat</Badge>}</td>
                    <td className="py-2 text-right">{g.trips}</td>
                    <td className="py-2 text-right font-medium">€{g.total.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lead source ROI</CardTitle></CardHeader>
          <CardContent>
            {!sourceROI.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No lead data yet. Tag customers with a lead source to see ROI.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="py-2 text-left">Source</th>
                    <th className="py-2 text-right">Leads</th>
                    <th className="py-2 text-right">Conv %</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceROI.map(r => (
                    <tr key={r.source} className="border-b last:border-0">
                      <td className="py-2">{r.source}</td>
                      <td className="py-2 text-right">{r.leads}</td>
                      <td className="py-2 text-right">{r.leads ? `${((r.converted / r.leads) * 100).toFixed(0)}%` : "—"}</td>
                      <td className="py-2 text-right font-medium">€{r.revenue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lost-deal reasons</CardTitle></CardHeader>
          <CardContent>
            {!lostReasons.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No lost deals recorded. When you mark a lead as "Lost", you'll be asked for a reason.</p>
            ) : (
              <div className="space-y-2">
                {lostReasons.map(r => {
                  const total = lostReasons.reduce((s, x) => s + x.count, 0);
                  const pct = (r.count / total) * 100;
                  return (
                    <div key={r.reason}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{r.reason}</span>
                        <Badge variant="secondary">{r.count}</Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-destructive" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </CardContent></Card>
  );
}

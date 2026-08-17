import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Calendar, Receipt, TrendingUp, Wallet, PiggyBank, Trophy, Building2, CalendarClock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useCurrentRole } from "@/hooks/use-current-role";
import { getCompany } from "@/lib/companies";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { canSeeFinancials } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["dashboard", canSeeFinancials],
    queryFn: async () => {
      const [customers, packages, bookings, invoices, allBookings, expenses, payments] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("tour_packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("*, customer:customers(name), package:tour_packages(name)").order("created_at", { ascending: false }).limit(5),
        canSeeFinancials ? supabase.from("invoices").select("total, status, company") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials
          ? supabase.from("bookings").select("id, total_amount, company, status").then(async (r) =>
              // Fall back if the `company` column hasn't been added to the DB yet.
              r.error ? await supabase.from("bookings").select("id, total_amount, status") : r)
          : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("booking_expenses").select("amount") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("booking_installments").select("booking_id, amount, paid, due_date") : Promise.resolve({ data: [] as any[] }),
      ]);
      const revenue = (invoices.data ?? []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
      const outstanding = (invoices.data ?? []).filter((i: any) => ["sent","overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0);
      const bookingSales = (allBookings.data ?? []).reduce((s: number, b: any) => s + Number(b.total_amount), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const profit = bookingSales - totalExpenses;

      // Booking payments (from installments): received = paid, due = unpaid.
      const totalReceived = (payments.data ?? []).filter((p: any) => p.paid).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      const totalDue = (payments.data ?? []).filter((p: any) => !p.paid).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      // "Coming in" — unpaid installments due within the next 30 days.
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      const horizon = in30.toISOString().slice(0, 10);
      const dueSoon = (payments.data ?? [])
        .filter((p: any) => !p.paid && p.due_date && p.due_date <= horizon)
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      // booking_id -> company, to split payments per company.
      const bookingCompany = new Map<string, string>();
      for (const b of (allBookings.data ?? []) as any[]) bookingCompany.set(b.id, b.company || "ttt-dmc");

      // Per-company leaderboard (excludes cancelled bookings from the sales figure).
      const byCompany = new Map<string, { id: string; sales: number; count: number; won: number; received: number; due: number }>();
      const ensure = (id: string) => {
        const row = byCompany.get(id) ?? { id, sales: 0, count: 0, won: 0, received: 0, due: 0 };
        byCompany.set(id, row); return row;
      };
      for (const b of (allBookings.data ?? []) as any[]) {
        const row = ensure(b.company || "ttt-dmc");
        row.count += 1;
        if (b.status !== "cancelled") row.sales += Number(b.total_amount) || 0;
        if (["confirmed","travelling","completed","deposit_paid"].includes(b.status)) row.won += 1;
      }
      for (const p of (payments.data ?? []) as any[]) {
        const cid = bookingCompany.get(p.booking_id) || "ttt-dmc";
        const row = ensure(cid);
        if (p.paid) row.received += Number(p.amount) || 0;
        else row.due += Number(p.amount) || 0;
      }
      const companySales = [...byCompany.values()].sort((a, b) => b.sales - a.sales);

      return {
        customers: customers.count ?? 0,
        packages: packages.count ?? 0,
        bookings: bookings.data ?? [],
        revenue, outstanding, bookingSales, totalExpenses, profit,
        totalReceived, totalDue, dueSoon,
        companySales,
      };
    },
  });

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
        <p className="text-muted-foreground">Your Finland tour business at a glance.</p>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    inquiry: "bg-muted text-muted-foreground",
    confirmed: "bg-accent text-accent-foreground",
    completed: "bg-success text-success-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <Badge className={map[status] ?? ""} variant="secondary">{status}</Badge>;
}

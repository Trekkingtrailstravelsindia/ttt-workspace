import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Calendar, Receipt, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useCurrentRole } from "@/hooks/use-current-role";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { canSeeFinancials } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["dashboard", canSeeFinancials],
    queryFn: async () => {
      const [customers, packages, bookings, invoices, allBookings, expenses] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("tour_packages").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("*, customer:customers(name), package:tour_packages(name)").order("created_at", { ascending: false }).limit(5),
        canSeeFinancials ? supabase.from("invoices").select("total, status") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("bookings").select("total_amount") : Promise.resolve({ data: [] as any[] }),
        canSeeFinancials ? supabase.from("booking_expenses").select("amount") : Promise.resolve({ data: [] as any[] }),
      ]);
      const revenue = (invoices.data ?? []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
      const outstanding = (invoices.data ?? []).filter((i: any) => ["sent","overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0);
      const bookingSales = (allBookings.data ?? []).reduce((s: number, b: any) => s + Number(b.total_amount), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const profit = bookingSales - totalExpenses;
      return {
        customers: customers.count ?? 0,
        packages: packages.count ?? 0,
        bookings: bookings.data ?? [],
        revenue, outstanding, bookingSales, totalExpenses, profit,
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

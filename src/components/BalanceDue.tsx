import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, AlertTriangle, Wallet } from "lucide-react";
import { getCompany } from "@/lib/companies";

type Row = {
  id: string; start_date: string; total_amount: number; status: string; company?: string | null;
  customer?: { name: string; phone: string | null; email: string | null } | null;
  package?: { name: string } | null;
};

const WINDOWS = [
  { key: "all", label: "All" },
  { key: "7", label: "≤ 7 days" },
  { key: "14", label: "≤ 14 days" },
  { key: "30", label: "≤ 30 days" },
] as const;

function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function isoPlus(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export function BalanceDue({ companyFilter = "all" }: { companyFilter?: string }) {
  const [win, setWin] = useState<string>("all");

  const { data: bookings } = useQuery({
    queryKey: ["balance-bookings"],
    queryFn: async () => {
      const r = await supabase.from("bookings").select("id,start_date,total_amount,status,company,customer:customers(name,phone,email),package:tour_packages(name)");
      if (r.error) {
        const r2 = await supabase.from("bookings").select("id,start_date,total_amount,status,customer:customers(name,phone,email),package:tour_packages(name)");
        return (r2.data as unknown as Row[]) ?? [];
      }
      return (r.data as unknown as Row[]) ?? [];
    },
  });
  const { data: installments } = useQuery({
    queryKey: ["booking-installments-all"],
    queryFn: async () => (await supabase.from("booking_installments").select("booking_id, amount, paid")).data ?? [],
  });

  const rows = useMemo(() => {
    const recv = new Map<string, number>();
    const unpaid = new Map<string, number>();
    for (const it of (installments ?? []) as any[]) {
      if (it.paid) recv.set(it.booking_id, (recv.get(it.booking_id) ?? 0) + (Number(it.amount) || 0));
      else unpaid.set(it.booking_id, (unpaid.get(it.booking_id) ?? 0) + (Number(it.amount) || 0));
    }
    const today = todayIso();
    const horizon = win === "all" ? null : isoPlus(Number(win));
    return (bookings ?? [])
      .filter(b => b.status !== "cancelled")
      .filter(b => companyFilter === "all" || getCompany(b.company).id === companyFilter)
      .map(b => {
        const received = recv.get(b.id) ?? 0;
        const due = Math.max(Number(b.total_amount) - received, unpaid.get(b.id) ?? 0);
        return { ...b, received, due, overdue: b.start_date < today };
      })
      .filter(r => r.due > 0.01)
      .filter(r => !horizon ? true : (r.start_date <= horizon))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [bookings, installments, win, companyFilter]);

  const totalDue = rows.reduce((s, r) => s + r.due, 0);

  function reminderMessage(r: typeof rows[number]) {
    const co = getCompany(r.company).name;
    const act = r.package?.name ? ` for your ${r.package.name}` : "";
    return `Hi ${r.customer?.name ?? "there"}, a friendly reminder from ${co} about your booking${act} on ${r.start_date}. Outstanding balance: €${r.due.toFixed(0)}. Please let us know if you have any questions — thank you!`;
  }
  function waLink(r: typeof rows[number]) {
    const digits = (r.customer?.phone ?? "").replace(/[^\d]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(reminderMessage(r))}`;
  }
  function mailLink(r: typeof rows[number]) {
    const subject = `Payment reminder — ${getCompany(r.company).name}`;
    return `mailto:${r.customer?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reminderMessage(r))}`;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-5 text-primary" /> Balance due
          <span className="text-sm font-normal text-muted-foreground">· {rows.length} booking{rows.length === 1 ? "" : "s"} · €{totalDue.toFixed(0)} outstanding</span>
        </CardTitle>
        <div className="flex gap-1">
          {WINDOWS.map(w => (
            <button key={w.key} type="button" onClick={() => setWin(w.key)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${win === w.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}>
              {w.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nothing outstanding{win !== "all" ? " in this window" : ""}. 🎉</div>
        ) : (
          <div className="divide-y">
            {rows.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to="/bookings/$id" params={{ id: r.id }} className="truncate font-medium hover:underline">{r.customer?.name ?? "—"}</Link>
                    {r.overdue && <Badge variant="secondary" className="bg-destructive/10 text-destructive"><AlertTriangle className="mr-1 size-3" />trip passed</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getCompany(r.company).name} · {r.package?.name ?? "—"} · {r.start_date}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="font-semibold text-destructive">€{r.due.toFixed(0)} due</div>
                    <div className="text-xs text-muted-foreground">€{r.received.toFixed(0)} of €{Number(r.total_amount).toFixed(0)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline" disabled={!r.customer?.phone}
                      className={!r.customer?.phone ? "pointer-events-none opacity-40" : ""}>
                      <a href={waLink(r)} target="_blank" rel="noreferrer" title={r.customer?.phone ? "Send WhatsApp reminder" : "No phone on file"}>
                        <MessageCircle className="size-4 text-success" /> WhatsApp
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline" disabled={!r.customer?.email}
                      className={!r.customer?.email ? "pointer-events-none opacity-40" : ""}>
                      <a href={mailLink(r)} title={r.customer?.email ? "Email reminder" : "No email on file"}>
                        <Mail className="size-4" /> Email
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

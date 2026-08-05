import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentRole } from "@/hooks/use-current-role";

export const Route = createFileRoute("/_authenticated/cash-flow")({ component: CashFlow });

const FX_TO_EUR: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.17, INR: 0.011 };
const toEUR = (amount: number, currency: string, fx?: number | null) =>
  amount * (fx && fx > 0 ? Number(fx) : (FX_TO_EUR[currency] ?? 1));

function CashFlow() {
  const { canSeeFinancials } = useCurrentRole();
  const qc = useQueryClient();
  const [horizon, setHorizon] = useState("60");

  const { data: installments = [] } = useQuery({
    queryKey: ["cf-installments"],
    queryFn: async () => (await supabase.from("booking_installments").select("*").order("due_date")).data ?? [],
  });
  const { data: payables = [] } = useQuery({
    queryKey: ["cf-payables"],
    queryFn: async () => (await supabase.from("supplier_payables").select("*, supplier:suppliers(name)").order("due_date")).data ?? [],
  });
  const { data: commissions = [] } = useQuery({
    queryKey: ["cf-commissions"],
    queryFn: async () => (await supabase.from("commissions").select("*").order("created_at")).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["cf-suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? [],
  });

  const buckets = useMemo(() => {
    const days = Number(horizon);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + days);

    const inflowsAll = installments
      .filter((i: any) => !i.paid && new Date(i.due_date) <= end)
      .map((i: any) => ({ ...i, eur: toEUR(Number(i.amount), i.currency) }));

    const outflowsAll = [
      ...payables.filter((p: any) => !p.paid && new Date(p.due_date) <= end)
        .map((p: any) => ({ kind: "payable", ...p, eur: toEUR(Number(p.amount), p.currency) })),
      ...commissions.filter((c: any) => c.status !== "paid")
        .map((c: any) => ({ kind: "commission", ...c, due_date: c.created_at.slice(0, 10), eur: toEUR(Number(c.amount), c.currency) })),
    ];

    const overdueIn = inflowsAll.filter(i => new Date(i.due_date) < today);
    const upcomingIn = inflowsAll.filter(i => new Date(i.due_date) >= today);
    const overdueOut = outflowsAll.filter(o => new Date(o.due_date) < today);
    const upcomingOut = outflowsAll.filter(o => new Date(o.due_date) >= today);

    const sum = (arr: any[]) => arr.reduce((s, x) => s + Number(x.eur), 0);
    return {
      inflowsAll, outflowsAll, overdueIn, upcomingIn, overdueOut, upcomingOut,
      totalIn: sum(inflowsAll), totalOut: sum(outflowsAll),
      net: sum(inflowsAll) - sum(outflowsAll),
    };
  }, [installments, payables, commissions, horizon]);

  if (!canSeeFinancials) {
    return <div className="py-12 text-center text-muted-foreground">You do not have access to financial data.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary">Cash flow forecast</h1>
          <p className="text-sm text-muted-foreground">Expected money in vs supplier payouts — normalized to EUR.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Horizon</Label>
          <Select value={horizon} onValueChange={setHorizon}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Expected inflows" value={buckets.totalIn} icon={TrendingUp} tone="positive" />
        <Kpi label="Expected outflows" value={buckets.totalOut} icon={TrendingDown} tone="negative" />
        <Kpi label="Net" value={buckets.net} icon={Wallet} tone={buckets.net >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Money in</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bucket title="Overdue" items={buckets.overdueIn} tone="danger" />
            <Bucket title="Upcoming" items={buckets.upcomingIn} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Money out</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bucket title="Overdue" items={buckets.overdueOut} tone="danger" isOut />
            <Bucket title="Upcoming" items={buckets.upcomingOut} isOut />
          </CardContent>
        </Card>
      </div>

      <AddPayable suppliers={suppliers as any[]} onAdded={() => qc.invalidateQueries({ queryKey: ["cf-payables"] })} />
      <PayablesList payables={payables as any[]} onChanged={() => qc.invalidateQueries({ queryKey: ["cf-payables"] })} />
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={`rounded-lg p-2 ${tone === "positive" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">€{value.toFixed(2)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Bucket({ title, items, tone, isOut }: { title: string; items: any[]; tone?: "danger"; isOut?: boolean }) {
  const total = items.reduce((s, x) => s + Number(x.eur), 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className={`text-sm font-semibold ${tone === "danger" ? "text-destructive" : ""}`}>€{total.toFixed(2)}</div>
      </div>
      {items.length === 0 ? (
        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Nothing here.</div>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 10).map((x: any) => (
            <div key={x.id} className="flex items-center justify-between rounded border bg-card/60 px-3 py-2 text-sm">
              <div>
                <div>{x.label || x.description || x.agent_name || (isOut ? "Payout" : "Payment")}</div>
                <div className="text-xs text-muted-foreground">
                  Due {x.due_date}{x.currency && x.currency !== "EUR" ? ` · ${x.currency} ${Number(x.amount).toFixed(2)}` : ""}
                  {x.kind === "commission" && <Badge variant="secondary" className="ml-2">Commission</Badge>}
                </div>
              </div>
              <div className="font-medium">€{Number(x.eur).toFixed(2)}</div>
            </div>
          ))}
          {items.length > 10 && <div className="text-center text-xs text-muted-foreground">+ {items.length - 10} more…</div>}
        </div>
      )}
    </div>
  );
}

function AddPayable({ suppliers, onAdded }: { suppliers: any[]; onAdded: () => void }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [due, setDue] = useState("");
  const [supplierId, setSupplierId] = useState<string>("__none__");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc || !amount || !due) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("supplier_payables").insert({
      user_id: u.user!.id, description: desc, amount: Number(amount), currency, due_date: due,
      supplier_id: supplierId === "__none__" ? null : supplierId,
    });
    if (error) return toast.error(error.message);
    setDesc(""); setAmount(""); setDue(""); setSupplierId("__none__");
    toast.success("Payable added");
    onAdded();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Add supplier payable</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-2 sm:grid-cols-6">
          <Input className="sm:col-span-2" placeholder="Description (e.g. Igloo booking)" value={desc} onChange={e => setDesc(e.target.value)} />
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No supplier</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{["EUR","USD","GBP","INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
          <Button type="submit"><Plus className="size-4" /> Add</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PayablesList({ payables, onChanged }: { payables: any[]; onChanged: () => void }) {
  async function togglePaid(row: any) {
    const paid = !row.paid;
    const { error } = await supabase.from("supplier_payables").update({
      paid, paid_at: paid ? new Date().toISOString() : null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    onChanged();
  }
  async function del(id: string) {
    if (!confirm("Delete payable?")) return;
    const { error } = await supabase.from("supplier_payables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">All supplier payables</CardTitle></CardHeader>
      <CardContent>
        {payables.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No payables tracked yet.</div>
        ) : (
          <div className="space-y-2">
            {payables.map((p: any) => (
              <div key={p.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${p.paid ? "bg-muted/40" : "bg-card/60"}`}>
                <div className="flex items-center gap-3">
                  <Button variant={p.paid ? "default" : "outline"} size="icon" className="size-8" onClick={() => togglePaid(p)}>
                    <Check className="size-4" />
                  </Button>
                  <div>
                    <div className="text-sm font-medium">{p.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.supplier?.name ? `${p.supplier.name} · ` : ""}Due {p.due_date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{p.currency} {Number(p.amount).toFixed(2)}</div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => del(p.id)}>
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

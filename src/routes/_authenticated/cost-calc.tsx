import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cost-calc")({ component: CostCalc });

const FX_TO_EUR: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.17, INR: 0.011 };
const CURRENCIES = ["EUR", "USD", "GBP", "INR"];

type Line = { id: number; label: string; qty: string; unit: string; currency: string };

let nextId = 1;
const blank = (): Line => ({ id: nextId++, label: "", qty: "1", unit: "", currency: "EUR" });

function CostCalc() {
  const [lines, setLines] = useState<Line[]>([blank(), blank(), blank()]);
  const [markup, setMarkup] = useState("30");
  const [pax, setPax] = useState("2");

  function update(id: number, patch: Partial<Line>) {
    setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => {
      const q = Number(l.qty) || 0;
      const u = Number(l.unit) || 0;
      const fx = FX_TO_EUR[l.currency] ?? 1;
      return s + q * u * fx;
    }, 0);
    const m = Number(markup) || 0;
    const sell = cost * (1 + m / 100);
    const profit = sell - cost;
    const margin = sell ? (profit / sell) * 100 : 0;
    const n = Math.max(1, Number(pax) || 1);
    return { cost, sell, profit, margin, perPax: sell / n };
  }, [lines, markup, pax]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary">Cost calculator</h1>
        <p className="text-muted-foreground">Build a tour cost from components, add markup, see margin — all in EUR.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Cost components</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="hidden gap-2 px-1 text-xs uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_5rem_7rem_6rem_2.5rem]">
            <div>Item</div><div className="text-right">Qty</div><div className="text-right">Unit cost</div><div>Currency</div><div />
          </div>
          {lines.map(l => (
            <div key={l.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_6rem_2.5rem]">
              <Input placeholder="e.g. Glass igloo / night" value={l.label} onChange={e => update(l.id, { label: e.target.value })} />
              <Input type="number" step="0.01" className="text-right" value={l.qty} onChange={e => update(l.id, { qty: e.target.value })} />
              <Input type="number" step="0.01" className="text-right" placeholder="0.00" value={l.unit} onChange={e => update(l.id, { unit: e.target.value })} />
              <Select value={l.currency} onValueChange={v => update(l.id, { currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setLines(ls => ls.length > 1 ? ls.filter(x => x.id !== l.id) : ls)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLines(ls => [...ls, blank()])}>
            <Plus className="size-4" /> Add line
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="markup">Markup %</Label>
              <Input id="markup" type="number" step="1" value={markup} onChange={e => setMarkup(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pax">Travellers (for per-person price)</Label>
              <Input id="pax" type="number" step="1" min="1" value={pax} onChange={e => setPax(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Result</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total cost" value={totals.cost} />
            <Row label={`Sell price (+${Number(markup) || 0}%)`} value={totals.sell} strong />
            <Row label="Profit" value={totals.profit} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className="font-semibold">{totals.margin.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">Price per traveller</span>
              <span className="font-semibold">€{totals.perPax.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-lg font-semibold" : "font-medium"}>€{value.toFixed(2)}</span>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { COMPANIES, DEFAULT_COMPANY } from "@/lib/companies";
import { parseBookingText, type ParsedBooking } from "@/lib/parse-booking-text";

const PLACEHOLDER = `Paste something like:
Martina Kahr — Husky Safari 5km — 24 Dec 2026 — 18:00 — 2 pax

or

Customer: John Smith
Activity: Northern Lights Tour
Date: 2026-12-31
Time: 8 PM
Pax: 4`;

export function QuickAddBooking({ company }: { company?: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);
  const [companyId, setCompanyId] = useState<string>(company ?? DEFAULT_COMPANY);
  const [saving, setSaving] = useState(false);

  async function knownActivityNames(): Promise<string[]> {
    const { data } = await supabase.from("tour_packages").select("name").eq("active", true);
    return (data ?? []).map((p: any) => p.name);
  }

  async function handleParse() {
    if (!text.trim()) return toast.error("Paste some booking text first");
    const names = await knownActivityNames();
    const p = parseBookingText(text, names);
    if (!p.customer && !p.activity && !p.startDate) return toast.error("Couldn't find a customer, activity, or date — edit the fields below.");
    setParsed(p);
  }

  function update<K extends keyof ParsedBooking>(k: K, v: ParsedBooking[K]) {
    setParsed(prev => prev ? { ...prev, [k]: v } : prev);
  }

  async function findOrCreateCustomer(name: string, userId: string): Promise<string | null> {
    const { data: existing } = await supabase.from("customers").select("id").ilike("name", name).limit(1);
    if (existing && existing.length) return existing[0].id;
    const insert: Record<string, any> = { user_id: userId, name };
    if (parsed?.email) insert.email = parsed.email;
    if (parsed?.phone) insert.phone = parsed.phone;
    if (parsed?.country) insert.country = parsed.country;
    const { data, error } = await supabase.from("customers").insert(insert as any).select("id").single();
    if (error) { toast.error("Customer: " + error.message); return null; }
    return data.id;
  }

  async function findOrCreatePackage(name: string, userId: string): Promise<{ id: string; price: number; days: number } | null> {
    const { data: existing } = await supabase.from("tour_packages").select("id,price_per_person,duration_days").ilike("name", name).limit(1);
    if (existing && existing.length) return { id: existing[0].id, price: Number(existing[0].price_per_person) || 0, days: existing[0].duration_days || 1 };
    const { data, error } = await supabase.from("tour_packages").insert({ user_id: userId, name, price_per_person: 0, duration_days: 1, active: true }).select("id,price_per_person,duration_days").single();
    if (error) { toast.error("Activity: " + error.message); return null; }
    return { id: data.id, price: Number(data.price_per_person) || 0, days: data.duration_days || 1 };
  }

  async function handleSave() {
    if (!parsed) return;
    if (!parsed.customer.trim()) return toast.error("Customer name is required");
    if (!parsed.activity.trim()) return toast.error("Activity/package is required");
    if (!parsed.startDate) return toast.error("A start date is required");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      const customerId = await findOrCreateCustomer(parsed.customer.trim(), userId);
      if (!customerId) return;
      const pkg = await findOrCreatePackage(parsed.activity.trim(), userId);
      if (!pkg) return;

      const payload: Record<string, any> = {
        user_id: userId,
        company: companyId,
        customer_id: customerId,
        package_id: pkg.id,
        start_date: parsed.startDate,
        end_date: parsed.endDate || null,
        travelers: parsed.pax || 1,
        total_amount: pkg.price * (parsed.pax || 1),
        status: "inquiry",
        start_time: parsed.time || null,
        notes: parsed.time ? `Start time: ${parsed.time}` : null,
      };

      const run = (p: Record<string, any>) => supabase.from("bookings").insert(p as any).select("id").single();
      let { error } = await run(payload);
      // Fallback if company / start_time columns aren't in the DB yet.
      if (error && /(company|start_time)/i.test(error.message)) {
        const { company: _c, start_time: _t, ...rest } = payload;
        const note = [parsed.time ? `Start time: ${parsed.time}` : "", rest.notes && rest.notes !== `Start time: ${parsed.time}` ? rest.notes : ""].filter(Boolean).join(" · ");
        ({ error } = await run({ ...rest, notes: note || null }));
      }
      if (error) { toast.error(error.message); return; }

      toast.success(`Added ${parsed.customer} · ${parsed.activity}`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["calendar-bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setText(""); setParsed(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wand2 className="size-5 text-primary" /> Quick add from text</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Paste booking details — name, activity, date, time, pax — and the CRM extracts them, then drops the booking on the calendar.</p>
        <Textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder={PLACEHOLDER} className="bg-card font-mono text-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleParse}><Wand2 className="size-4" /> Read details</Button>
          {parsed && <span className="text-xs text-muted-foreground">Check the fields, then add.</span>}
        </div>

        {parsed && (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Customer</Label>
                <Input value={parsed.customer} onChange={e => update("customer", e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label className="text-xs">Activity / package</Label>
                <Input value={parsed.activity} onChange={e => update("activity", e.target.value)} placeholder="e.g. Husky Safari" />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-xs"><Building2 className="size-3" /> Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPANIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pax</Label>
                <Input type="number" min={1} value={parsed.pax} onChange={e => update("pax", Number(e.target.value) || 1)} />
              </div>
              <div>
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={parsed.startDate} onChange={e => update("startDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End date</Label>
                <Input type="date" value={parsed.endDate} onChange={e => update("endDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input type="time" value={parsed.time} onChange={e => update("time", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setParsed(null)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={handleSave}><Plus className="size-4" /> {saving ? "Adding…" : "Add to system"}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

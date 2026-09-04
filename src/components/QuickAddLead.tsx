import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Plus } from "lucide-react";
import { toast } from "sonner";
import { parseBookingText } from "@/lib/parse-booking-text";

const PLACEHOLDER = `Paste an inquiry, e.g.:
Hi, I'm Sara from Germany, interested in the Husky Safari around 24 Dec for 2 people. WhatsApp +49 170 1234567`;

type LeadDraft = {
  name: string; email: string; phone: string; country: string;
  source: string; activity: string; startDate: string; endDate: string; pax: number;
};

export function QuickAddLead() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleParse() {
    if (!text.trim()) return toast.error("Paste an inquiry first");
    const names = ((await supabase.from("tour_packages").select("name").eq("active", true)).data ?? []).map((p: any) => p.name);
    const p = parseBookingText(text, names);
    if (!p.customer && !p.email && !p.phone) return toast.error("Couldn't find a name or contact — edit the fields below.");
    setDraft({
      name: p.customer, email: p.email, phone: p.phone, country: p.country,
      source: p.source, activity: p.activity, startDate: p.startDate, endDate: p.endDate, pax: p.pax,
    });
  }

  function up<K extends keyof LeadDraft>(k: K, v: LeadDraft[K]) { setDraft(d => d ? { ...d, [k]: v } : d); }

  async function handleSave() {
    if (!draft) return;
    if (!draft.name.trim()) return toast.error("Lead name is required");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const interest = [
        draft.activity && `Interested in: ${draft.activity}`,
        draft.startDate && `Dates: ${draft.startDate}${draft.endDate ? ` → ${draft.endDate}` : ""}`,
        draft.pax && `Pax: ${draft.pax}`,
      ].filter(Boolean).join(" · ");
      const payload: Record<string, any> = {
        user_id: u.user!.id,
        name: draft.name.trim(),
        email: draft.email || null,
        phone: draft.phone || null,
        country: draft.country || null,
        stage: "new_lead",
        lead_source: draft.source || null,
        notes: interest || null,
      };
      const run = (p: Record<string, any>) => supabase.from("customers").insert(p as any).select("id").single();
      let { error } = await run(payload);
      if (error && /(stage|lead_source)/i.test(error.message)) {
        const { stage: _s, lead_source: _l, ...rest } = payload;
        ({ error } = await run(rest));
      }
      if (error) { toast.error(error.message); return; }
      toast.success(`Lead added: ${draft.name}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setText(""); setDraft(null);
    } finally { setSaving(false); }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="size-5 text-primary" /> Quick add lead from text</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Paste a WhatsApp/DM/email inquiry — the CRM pulls out the name, contact, interest and dates, and files it as a new lead.</p>
        <Textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder={PLACEHOLDER} className="bg-card font-mono text-xs" />
        <Button type="button" onClick={handleParse}><Wand2 className="size-4" /> Read inquiry</Button>

        {draft && (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className="text-xs">Name</Label><Input value={draft.name} onChange={e => up("name", e.target.value)} /></div>
              <div><Label className="text-xs">Source</Label><Input value={draft.source} onChange={e => up("source", e.target.value)} placeholder="whatsapp / instagram…" /></div>
              <div><Label className="text-xs">Email</Label><Input value={draft.email} onChange={e => up("email", e.target.value)} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={draft.phone} onChange={e => up("phone", e.target.value)} /></div>
              <div><Label className="text-xs">Country</Label><Input value={draft.country} onChange={e => up("country", e.target.value)} /></div>
              <div><Label className="text-xs">Interested in</Label><Input value={draft.activity} onChange={e => up("activity", e.target.value)} /></div>
              <div><Label className="text-xs">Dates from</Label><Input type="date" value={draft.startDate} onChange={e => up("startDate", e.target.value)} /></div>
              <div><Label className="text-xs">Pax</Label><Input type="number" min={1} value={draft.pax} onChange={e => up("pax", Number(e.target.value) || 1)} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={handleSave}><Plus className="size-4" /> {saving ? "Adding…" : "Add lead"}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

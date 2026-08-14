import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/whatsapp")({ component: WhatsAppPage });

const COUNTRY_CODES = [
  { value: "91", label: "India +91" },
  { value: "358", label: "Finland +358" },
  { value: "1", label: "USA/Canada +1" },
  { value: "44", label: "UK +44" },
  { value: "971", label: "UAE +971" },
  { value: "49", label: "Germany +49" },
  { value: "33", label: "France +33" },
  { value: "61", label: "Australia +61" },
];

type Contact = { name: string; digits: string };

// Turn a raw phone string into full international digits (no +, no spaces).
function normalize(raw: string, defaultCc: string): string | null {
  const hadPlus = raw.trim().startsWith("+") || raw.trim().startsWith("00");
  let d = raw.replace(/\D/g, "").replace(/^00/, "");
  if (!d) return null;
  if (!hadPlus && d.length <= 10) d = defaultCc + d;      // local number → add country code
  if (d.length < 8 || d.length > 15) return null;          // implausible
  return d;
}

function parseContacts(text: string, defaultCc: string): Contact[] {
  const out: Contact[] = [];
  const seen = new Set<string>();
  const add = (name: string, raw: string) => {
    const digits = normalize(raw, defaultCc);
    if (!digits || seen.has(digits)) return;
    seen.add(digits);
    out.push({ name: (name || "").replace(/["']/g, "").trim(), digits });
  };

  if (/BEGIN:VCARD/i.test(text)) {
    for (const card of text.split(/BEGIN:VCARD/i)) {
      const fn = (card.match(/\nFN[^:\n]*:([^\n\r]+)/i) || [])[1]?.trim() || "";
      const tels = card.match(/TEL[^:\n]*:\s*([+\d][\d\s().\-]{5,})/gi) || [];
      for (const t of tels) add(fn, t.split(":").pop() || "");
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      const nums = line.match(/\+?\d[\d\s().\-]{6,}\d/g);
      if (!nums) continue;
      for (const num of nums) {
        const idx = line.indexOf(num);
        const before = line.slice(0, idx).split(/[,;\t|]/).map(s => s.trim()).filter(Boolean).pop() || "";
        add(before, num);
      }
    }
  }
  return out;
}

function WhatsAppPage() {
  const [defaultCc, setDefaultCc] = useState("91");
  const [raw, setRaw] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState(
    "Hi {name}, greetings from Trekking Trails Travels! 🌌\n\nThank you for your interest in our Finland & Lapland tours. I'd love to share a tailored itinerary with you."
  );
  const [itinerary, setItinerary] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  function loadText(text: string) {
    const parsed = parseContacts(text, defaultCc);
    if (!parsed.length) return toast.error("No phone numbers found in that file");
    setContacts(parsed);
    toast.success(`${parsed.length} number(s) found`);
  }

  async function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    const text = await file.text();
    loadText(text);
  }

  function waLink(c: Contact) {
    let msg = message.replace(/\{name\}/g, c.name || "there");
    if (itinerary.trim()) msg += `\n\nYour itinerary: ${itinerary.trim()}`;
    return `https://wa.me/${c.digits}?text=${encodeURIComponent(msg)}`;
  }

  const preview = useMemo(() => {
    const c = contacts[0] ?? { name: "there", digits: "" };
    let msg = message.replace(/\{name\}/g, c.name || "there");
    if (itinerary.trim()) msg += `\n\nYour itinerary: ${itinerary.trim()}`;
    return msg;
  }, [message, itinerary, contacts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary flex items-center gap-2"><MessageCircle className="size-7" /> WhatsApp leads</h1>
        <p className="text-sm text-muted-foreground">Upload a contact list, pull out every number, and message each lead in one click.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>1 · Import contacts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Default country code (for numbers without one)</Label>
              <Select value={defaultCc} onValueChange={setDefaultCc}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt,.vcf,.tsv,text/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Upload file (.csv, .txt, .vcf)
            </Button>
            <div className="text-center text-xs text-muted-foreground">or paste below (Excel: save as CSV first)</div>
            <Textarea rows={5} value={raw} onChange={e => setRaw(e.target.value)} placeholder={"Aino, +358 40 123 4567\nRahul 9876543210\n..."} />
            <Button className="w-full" onClick={() => loadText(raw)} disabled={!raw.trim()}>Extract numbers</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2 · Message</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Message (use <code>{"{name}"}</code> for the lead's name)</Label>
              <Textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div>
              <Label>Itinerary link (optional)</Label>
              <Input value={itinerary} onChange={e => setItinerary(e.target.value)} placeholder="https://…/itinerary.pdf" />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-muted-foreground">{preview}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>3 · Send — {contacts.length} number(s)</span>
            {contacts.length > 0 && <Button variant="ghost" size="sm" onClick={() => setContacts([])}><Trash2 className="size-4" /> Clear</Button>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No contacts yet — import a file or paste a list above.</div>
          ) : (
            <div className="divide-y">
              {contacts.map((c) => (
                <div key={c.digits} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name || <span className="text-muted-foreground">Unnamed</span>}</div>
                    <div className="text-xs text-muted-foreground">+{c.digits}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {opened.has(c.digits) && <Badge variant="secondary"><Check className="size-3" /> opened</Badge>}
                    <Button size="sm" asChild onClick={() => setOpened(prev => new Set(prev).add(c.digits))}>
                      <a href={waLink(c)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="size-4" /> WhatsApp
                      </a>
                    </Button>
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

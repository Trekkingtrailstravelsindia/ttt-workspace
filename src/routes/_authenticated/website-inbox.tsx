import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, CreditCard, MessageSquare, Check, Archive, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/website-inbox")({ component: WebsiteInbox });

const SITES: Record<string, { label: string; color: string }> = {
  lapland: { label: "Lapland", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  india: { label: "India", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  ruka: { label: "Ruka", color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  soulvia: { label: "SoulVia", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rovaniemi: { label: "Rovaniemi", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  trekking: { label: "Trekking Trails", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

type Row = {
  id: string;
  site: string;
  kind: "paid" | "lead";
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  package_title: string | null;
  departure: string | null;
  travel_date: string | null;
  adults: number | null;
  kids: number | null;
  amount: number | null;
  currency: string | null;
  payment_status: string | null;
  source: string | null;
  stripe_session_id: string | null;
  external_ref: string | null;
  notes: string | null;
  raw: Record<string, unknown> | null;
  status: "new" | "converted" | "archived";
  created_at: string;
};

function WebsiteInbox() {
  const qc = useQueryClient();
  const [site, setSite] = useState<string>("all");
  const [status, setStatus] = useState<string>("new");
  const [selected, setSelected] = useState<Row | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["website_bookings"],
    queryFn: async () =>
      ((await (supabase as any).from("website_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)).data as Row[]) ?? [],
    refetchInterval: 60000,
  });

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) => (site === "all" || r.site === site) && (status === "all" || r.status === status),
      ),
    [data, site, status],
  );

  const newCount = (data ?? []).filter((r) => r.status === "new").length;

  async function setRowStatus(id: string, next: Row["status"]) {
    const { error } = await (supabase as any).from("website_bookings").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next === "converted" ? "Marked converted" : next === "archived" ? "Archived" : "Updated");
    qc.invalidateQueries({ queryKey: ["website_bookings"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this inbox entry permanently?")) return;
    const { error } = await (supabase as any).from("website_bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["website_bookings"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Website inbox</h1>
          <p className="text-sm text-muted-foreground">
            Paid bookings &amp; leads captured from the public sites. {newCount} new.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Site" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {Object.entries(SITES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ["website_bookings"] })}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nothing here yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const brand = SITES[r.site] ?? { label: r.site, color: "bg-muted text-muted-foreground" };
            return (
              <Card key={r.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => setSelected(r)}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={brand.color} variant="secondary">{brand.label}</Badge>
                      <Badge variant={r.kind === "paid" ? "default" : "outline"} className="gap-1">
                        {r.kind === "paid" ? <CreditCard className="size-3" /> : <MessageSquare className="size-3" />}
                        {r.kind === "paid" ? "Paid" : "Lead"}
                      </Badge>
                      {r.status !== "new" && <Badge variant="outline" className="capitalize">{r.status}</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="font-medium">{r.customer_name || "Unknown"}
                      {r.amount != null && (
                        <span className="ml-2 text-primary">{r.currency === "INR" ? "₹" : "€"}{Math.round(r.amount).toLocaleString("en-IN")}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.package_title || "—"}
                      {(r.travel_date || r.departure) && <> · {r.departure || r.travel_date}</>}
                      {(r.adults != null) && <> · {r.adults} ad{r.kids ? ` · ${r.kids} ch` : ""}</>}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {r.customer_email && (
                        <a href={`mailto:${r.customer_email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Mail className="size-3.5" /> {r.customer_email}
                        </a>
                      )}
                      {r.customer_phone && (
                        <a href={`https://wa.me/${r.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Phone className="size-3.5" /> {r.customer_phone}
                        </a>
                      )}
                    </div>
                    {r.notes && <p className="max-w-xl whitespace-pre-wrap text-xs text-muted-foreground/80">{r.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                    {r.status !== "converted" && (
                      <Button size="sm" variant="outline" onClick={() => setRowStatus(r.id, "converted")}>
                        <Check className="size-4" /> Converted
                      </Button>
                    )}
                    {r.status !== "archived" && (
                      <Button size="sm" variant="ghost" onClick={() => setRowStatus(r.id, "archived")}>
                        <Archive className="size-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(SITES[selected.site]?.label) ?? selected.site} ·{" "}
                  {selected.kind === "paid" ? "Paid booking" : "Lead"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Detail label="Received" value={new Date(selected.created_at).toLocaleString()} />
                <Detail label="Status" value={selected.status} />
                <Detail label="Customer" value={selected.customer_name} />
                <Detail label="Email" value={selected.customer_email} />
                <Detail label="Phone" value={selected.customer_phone} />
                <Detail label="Package" value={selected.package_title} />
                <Detail label="Departure" value={selected.departure} />
                <Detail label="Travel date" value={selected.travel_date} />
                <Detail label="Travellers" value={selected.adults != null ? `${selected.adults} adult${selected.adults !== 1 ? "s" : ""}${selected.kids ? ` · ${selected.kids} child${selected.kids !== 1 ? "ren" : ""}` : ""}` : null} />
                <Detail label="Amount" value={selected.amount != null ? `${selected.currency === "INR" ? "₹" : "€"}${Math.round(selected.amount).toLocaleString("en-IN")}` : null} />
                <Detail label="Payment" value={selected.payment_status} />
                <Detail label="Source" value={selected.source} />
                <Detail label="Stripe session" value={selected.stripe_session_id} />
                <Detail label="Reference" value={selected.external_ref} />
                {selected.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes / message</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{selected.notes}</p>
                  </div>
                )}
                {selected.raw && Object.keys(selected.raw).length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">All submitted fields</p>
                    <div className="mt-1 space-y-1 rounded-lg bg-muted p-3">
                      {Object.entries(selected.raw).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-right break-words">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {selected.customer_email && (
                  <Button asChild size="sm" variant="outline"><a href={`mailto:${selected.customer_email}`}><Mail className="size-4" /> Email</a></Button>
                )}
                {selected.customer_phone && (
                  <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${selected.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"><Phone className="size-4" /> WhatsApp</a></Button>
                )}
                {selected.status !== "converted" && (
                  <Button size="sm" onClick={() => { setRowStatus(selected.id, "converted"); setSelected(null); }}><Check className="size-4" /> Converted</Button>
                )}
                {selected.status !== "archived" && (
                  <Button size="sm" variant="ghost" onClick={() => { setRowStatus(selected.id, "archived"); setSelected(null); }}><Archive className="size-4" /> Archive</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}

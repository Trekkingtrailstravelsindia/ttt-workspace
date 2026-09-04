import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  notes: string | null;
  status: "new" | "converted" | "archived";
  created_at: string;
};

function WebsiteInbox() {
  const qc = useQueryClient();
  const [site, setSite] = useState<string>("all");
  const [status, setStatus] = useState<string>("new");

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
              <Card key={r.id}>
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
                  <div className="flex shrink-0 gap-2">
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
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({ component: LeadsPage });

const STAGES = [
  { key: "new_lead", label: "New leads", color: "bg-muted text-muted-foreground" },
  { key: "contacted", label: "Contacted", color: "bg-accent/60 text-accent-foreground" },
  { key: "quoted", label: "Quoted", color: "bg-accent text-accent-foreground" },
  { key: "confirmed", label: "Confirmed", color: "bg-success/80 text-success-foreground" },
  { key: "completed", label: "Completed", color: "bg-success text-success-foreground" },
  { key: "lost", label: "Lost", color: "bg-destructive/10 text-destructive" },
] as const;

type Stage = typeof STAGES[number]["key"];
type Customer = { id: string; name: string; email: string | null; phone: string | null; country: string | null; stage: Stage; lead_source: string | null; lost_reason: string | null };

function LeadsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => (await supabase.from("customers").select("id,name,email,phone,country,stage,lead_source,lost_reason").order("created_at", { ascending: false })).data as Customer[] ?? [],
  });

  async function move(id: string, stage: Stage) {
    const patch: { stage: Stage; lost_reason?: string | null } = { stage };
    if (stage === "lost") {
      const reason = prompt("Reason for losing this deal? (helps future analysis)");
      if (reason === null) return;
      patch.lost_reason = reason || null;
    }
    const { error } = await supabase.from("customers").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved");
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-primary">Leads pipeline</h1>
        <p className="text-muted-foreground">Move inquiries through the sales stages.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => {
          const items = (data ?? []).filter((c) => c.stage === s.key);
          return (
            <div key={s.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{s.label}</div>
                <Badge variant="secondary" className={s.color}>{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="font-medium">{c.name}</div>
                      {c.country && <div className="text-xs text-muted-foreground">{c.country}</div>}
                      {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" /> {c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" /> {c.phone}</div>}
                      {c.lead_source && <Badge variant="outline" className="text-[10px]">{c.lead_source}</Badge>}
                      {c.stage === "lost" && c.lost_reason && <div className="text-[11px] italic text-destructive">"{c.lost_reason}"</div>}
                      <Select value={c.stage} onValueChange={(v) => move(c.id, v as Stage)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map(x => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
                {!items.length && <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

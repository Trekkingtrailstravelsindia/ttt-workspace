import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Mail, Phone, Globe } from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: string; name: string; email: string | null; phone: string | null;
  country: string | null; notes: string | null;
  lead_source: string | null; lost_reason: string | null; stage: string | null;
};

export const LEAD_SOURCES = ["Website", "Instagram", "Facebook", "Google Ads", "Referral", "Travel Agent", "Repeat Customer", "Other"];

export const Route = createFileRoute("/_authenticated/customers")({ component: CustomersPage });

function CustomersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  async function save(form: FormData) {
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      user_id: userData.user!.id,
      name: String(form.get("name")).trim(),
      email: (form.get("email") as string) || null,
      phone: (form.get("phone") as string) || null,
      country: (form.get("country") as string) || null,
      notes: (form.get("notes") as string) || null,
      lead_source: (form.get("lead_source") as string) || null,
      lost_reason: (form.get("lost_reason") as string) || null,
    };
    if (!payload.name) return toast.error("Name is required");
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Customer updated" : "Customer added");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Customers</h1>
          <p className="text-muted-foreground">All the travelers you work with.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
              <Field name="name" label="Full name" defaultValue={editing?.name} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="email" type="email" label="Email" defaultValue={editing?.email ?? ""} />
                <Field name="phone" label="Phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <Field name="country" label="Country" defaultValue={editing?.country ?? ""} />
              <div>
                <Label htmlFor="lead_source">Lead source</Label>
                <select id="lead_source" name="lead_source" defaultValue={editing?.lead_source ?? ""}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">—</option>
                  {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {editing?.stage === "lost" && (
                <Field name="lost_reason" label="Lost reason" defaultValue={editing?.lost_reason ?? ""}
                  placeholder="e.g. Price too high, went with competitor" />
              )}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} rows={3} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : !data?.length ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name}</div>
                    {c.country && <div className="text-xs text-muted-foreground">{c.country}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {c.email && <div className="flex items-center gap-2"><Mail className="size-3.5" /> {c.email}</div>}
                  {c.phone && <div className="flex items-center gap-2"><Phone className="size-3.5" /> {c.phone}</div>}
                  {c.country && <div className="flex items-center gap-2"><Globe className="size-3.5" /> {c.country}</div>}
                </div>
                {c.notes && <p className="mt-3 line-clamp-2 text-sm">{c.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card><CardContent className="py-16 text-center">
      <p className="mb-4 text-muted-foreground">No customers yet.</p>
      <Button onClick={onAdd}><Plus className="size-4" /> Add your first customer</Button>
    </CardContent></Card>
  );
}

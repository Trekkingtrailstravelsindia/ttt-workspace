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
import { Plus, Pencil, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

type Supplier = { id: string; name: string; category: string | null; contact_person: string | null; email: string | null; phone: string | null; notes: string | null };

export const Route = createFileRoute("/_authenticated/suppliers")({ component: SuppliersPage });

function SuppliersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data as Supplier[] ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  async function save(f: FormData) {
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      user_id: u.user!.id,
      name: String(f.get("name")).trim(),
      category: (f.get("category") as string) || null,
      contact_person: (f.get("contact_person") as string) || null,
      email: (f.get("email") as string) || null,
      phone: (f.get("phone") as string) || null,
      notes: (f.get("notes") as string) || null,
    };
    if (!payload.name) return toast.error("Name required");
    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Suppliers</h1>
          <p className="text-muted-foreground">Hotels, transport, activities, igloo & train providers.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add supplier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
              <Field name="name" label="Company name" defaultValue={editing?.name} required />
              <Field name="category" label="Category (Hotel, Transport, Activity, Igloo, Train…)" defaultValue={editing?.category ?? ""} />
              <Field name="contact_person" label="Contact person" defaultValue={editing?.contact_person ?? ""} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="email" type="email" label="Email" defaultValue={editing?.email ?? ""} />
                <Field name="phone" label="Phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ""} rows={3} />
              </div>
              <DialogFooter><Button type="submit">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <div className="py-12 text-center text-muted-foreground">Loading…</div>
       : !data?.length ? <Card><CardContent className="py-16 text-center text-muted-foreground">No suppliers yet.</CardContent></Card>
       : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    {s.category && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" /> {s.category}</div>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {s.contact_person && <div>{s.contact_person}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="size-3.5" /> {s.email}</div>}
                  {s.phone && <div className="flex items-center gap-2"><Phone className="size-3.5" /> {s.phone}</div>}
                </div>
                {s.notes && <p className="mt-3 line-clamp-2 text-sm">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...rest} /></div>;
}

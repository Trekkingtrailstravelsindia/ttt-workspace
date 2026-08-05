import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string; title: string; description: string | null;
  due_date: string | null; status: "pending" | "done"; priority: "low" | "medium" | "high";
  customer_id: string | null; booking_id: string | null;
  customer?: { name: string } | null;
};

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*, customer:customers(name)").order("due_date", { ascending: true, nullsFirst: false })).data as unknown as Task[] ?? [],
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-lite"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });
  const [open, setOpen] = useState(false);

  async function save(f: FormData) {
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      user_id: u.user!.id,
      title: String(f.get("title")).trim(),
      description: (f.get("description") as string) || null,
      due_date: (f.get("due_date") as string) || null,
      priority: (f.get("priority") as Task["priority"]) || "medium",
      customer_id: (f.get("customer_id") as string) || null,
    };
    if (!payload.title) return toast.error("Title required");
    const { error } = await supabase.from("tasks").insert(payload);
    if (error) return toast.error(error.message);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function toggle(t: Task) {
    const newStatus = t.status === "done" ? "pending" : "done";
    const { error } = await supabase.from("tasks").update({ status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = (t: Task) => t.status === "pending" && t.due_date && t.due_date < today;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Tasks & reminders</h1>
          <p className="text-muted-foreground">Follow-ups, calls, and due dates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> New task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
              <div><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
              <div><Label htmlFor="description">Details</Label><Textarea id="description" name="description" rows={3} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="due_date">Due date</Label><Input id="due_date" name="due_date" type="date" /></div>
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["low","medium","high"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Link to customer (optional)</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit">Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!data?.length ? <Card><CardContent className="py-16 text-center text-muted-foreground">No tasks yet.</CardContent></Card>
       : (
        <div className="space-y-2">
          {data.map((t) => (
            <Card key={t.id} className={t.status === "done" ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox checked={t.status === "done"} onCheckedChange={() => toggle(t)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className={"font-medium " + (t.status === "done" ? "line-through" : "")}>{t.title}</div>
                  {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {t.due_date && <span className={"flex items-center gap-1 " + (overdue(t) ? "text-destructive font-medium" : "")}><CalendarClock className="size-3" /> {t.due_date}{overdue(t) ? " (overdue)" : ""}</span>}
                    <Badge variant="secondary" className={t.priority === "high" ? "bg-destructive/10 text-destructive" : t.priority === "medium" ? "bg-accent/60" : "bg-muted"}>{t.priority}</Badge>
                    {t.customer?.name && <span>· {t.customer.name}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

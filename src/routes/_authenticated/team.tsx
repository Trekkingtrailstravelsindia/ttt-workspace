import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listTeam, createTeamMember, deleteTeamMember, setTeamMemberRole } from "@/lib/team.functions";
import { useCurrentRole, type AppRole } from "@/hooks/use-current-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserPlus, Users, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
  errorComponent: ({ error }) => <div className="text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div>Not found</div>,
});

const ROLES: AppRole[] = ["admin", "sales", "ops"];

function TeamPage() {
  const qc = useQueryClient();
  const { userId: currentId, isAdmin, isLoading: roleLoading } = useCurrentRole();
  const fetchTeam = useServerFn(listTeam);
  const create = useServerFn(createTeamMember);
  const remove = useServerFn(deleteTeamMember);
  const setRole = useServerFn(setTeamMemberRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleValue] = useState<AppRole>("sales");

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam({}),
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: () => create({ data: { email, password, role } }),
    onSuccess: () => {
      toast.success("Team member added");
      setEmail(""); setPassword("");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["team"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (v: { id: string; role: AppRole }) => setRole({ data: v }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["team"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (roleLoading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
    <Card><CardContent className="flex items-center gap-3 p-6 text-sm">
      <ShieldAlert className="size-5 text-destructive" />
      Admin access required. Ask a company admin to manage the team.
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="size-6 text-primary" />
        <div>
          <h1 className="font-display text-3xl">Team</h1>
          <p className="text-sm text-muted-foreground">
            Add staff, assign roles (Admin, Sales, Ops), and remove access.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="size-5" /> Add employee</CardTitle>
          <CardDescription>They can sign in immediately with these credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Work email</Label>
              <Input id="new-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="staff@trekkingtrailstravels.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Temporary password</Label>
              <Input id="new-pw" type="text" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRoleValue(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Adding..." : "Add"}
            </Button>
          </form>
          <div className="mt-3 text-xs text-muted-foreground">
            <b>Admin</b>: full access incl. finance & team. <b>Ops</b>: all bookings & finance, no team. <b>Sales</b>: only their assigned leads/bookings, no financial totals.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All members ({team.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="divide-y">
              {team.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {m.email}{m.id === currentId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last sign-in: {m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleString() : "never"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.roles.length === 0 && <Badge variant="outline">no role</Badge>}
                      {m.roles.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.roles[0] ?? "sales"}
                      onValueChange={(v) => roleMut.mutate({ id: m.id, role: v as AppRole })}
                      disabled={m.id === currentId}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon"
                      disabled={m.id === currentId || removeMut.isPending}
                      onClick={() => { if (confirm(`Remove ${m.email}?`)) removeMut.mutate(m.id); }}
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4 text-destructive" />
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

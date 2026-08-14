import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Package, Calendar, Receipt, LogOut, Compass, Menu, Truck, CheckSquare, CalendarDays, BarChart3, Filter, Settings, UserCog, Tags, CalendarClock, Wallet, Calculator, Search, MessageCircle } from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

import { useCurrentRole } from "@/hooks/use-current-role";

export const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","ops","sales"] },
  { to: "/leads", label: "Leads pipeline", icon: Filter, roles: ["admin","ops","sales"] },
  { to: "/whatsapp", label: "WhatsApp leads", icon: MessageCircle, roles: ["admin","ops","sales"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin","ops","sales"] },
  { to: "/packages", label: "Tour packages", icon: Package, roles: ["admin","ops","sales"] },
  { to: "/bookings", label: "Bookings", icon: Calendar, roles: ["admin","ops","sales"] },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin","ops","sales"] },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, roles: ["admin","ops","sales"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin","ops"] },
  { to: "/rate-cards", label: "Rate cards", icon: Tags, roles: ["admin","ops"] },
  { to: "/departures", label: "Departures", icon: CalendarClock, roles: ["admin","ops","sales"] },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: ["admin","ops"] },
  { to: "/cash-flow", label: "Cash flow", icon: Wallet, roles: ["admin","ops"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin","ops"] },
  { to: "/cost-calc", label: "Cost calculator", icon: Calculator, roles: ["admin","ops"] },
  { to: "/team", label: "Team", icon: UserCog, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin","ops","sales"] },
] as const;

function Shell() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <SidebarInner email={email} onSignOut={signOut} />
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </div>
          <span className="font-display text-lg">Trekking Trails Travels</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
            <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
            <SidebarInner email={email} onSignOut={signOut} />
          </SheetContent>
        </Sheet>
      </header>
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}

function openCommandPalette() {
  document.dispatchEvent(new CustomEvent("open-command-palette"));
}

function SidebarInner({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, isLoading } = useCurrentRole();
  const visible = nav.filter(item => isLoading || roles.length === 0 || item.roles.some(r => roles.includes(r as any)));
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Compass className="size-5" />
        </div>
        <div>
          <div className="font-display text-xl leading-none">Trekking Trails Travels</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Workspace</div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/60 px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <Search className="size-4" /> Search
          <kbd className="ml-auto rounded border border-sidebar-border/60 px-1.5 text-[10px]">⌘K</kbd>
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visible.map((item) => {
          const active = path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/60">{email}</div>
        <Button variant="ghost" onClick={onSignOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import { nav } from "@/routes/_authenticated/route";
import { useCurrentRole } from "@/hooks/use-current-role";
import { Plus, UserPlus, Calendar } from "lucide-react";

type BookingRow = { id: string; start_date: string | null; customer: { name: string } | null; package: { name: string } | null };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { roles, isLoading } = useCurrentRole();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    function onOpen() { setOpen(true); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("open-command-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // Recent bookings for quick jump (only fetched while the palette is open).
  const { data: bookings = [] } = useQuery({
    queryKey: ["palette-bookings"],
    enabled: open,
    queryFn: async () =>
      (await supabase
        .from("bookings")
        .select("id,start_date,customer:customers(name),package:tour_packages(name)")
        .order("created_at", { ascending: false })
        .limit(25)).data as unknown as BookingRow[] ?? [],
  });

  const visibleNav = nav.filter(
    item => isLoading || roles.length === 0 || item.roles.some(r => roles.includes(r as any))
  );

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    navigate({ to: to as any, params: params as any });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, bookings, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/bookings")}>
            <Plus className="size-4" /> New booking
            <CommandShortcut>Bookings</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/customers")}>
            <UserPlus className="size-4" /> New customer
            <CommandShortcut>Customers</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Go to">
          {visibleNav.map(item => (
            <CommandItem key={item.to} value={`go ${item.label}`} onSelect={() => go(item.to)}>
              <item.icon className="size-4" /> {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {bookings.length > 0 && (
          <CommandGroup heading="Bookings">
            {bookings.map(b => (
              <CommandItem
                key={b.id}
                value={`booking ${b.customer?.name ?? ""} ${b.package?.name ?? ""} ${b.start_date ?? ""}`}
                onSelect={() => go("/bookings/$id", { id: b.id })}
              >
                <Calendar className="size-4" />
                <span className="truncate">{b.customer?.name ?? "Booking"}</span>
                <CommandShortcut className="truncate">
                  {b.package?.name ?? ""}{b.start_date ? ` · ${b.start_date}` : ""}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

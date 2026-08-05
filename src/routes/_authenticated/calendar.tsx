import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Booking = { id: string; start_date: string; end_date: string | null; status: string; customer?: { name: string } | null; package?: { name: string } | null };

export const Route = createFileRoute("/_authenticated/calendar")({ component: CalendarPage });

function CalendarPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const { data } = useQuery({
    queryKey: ["calendar-bookings"],
    queryFn: async () => (await supabase.from("bookings").select("id,start_date,end_date,status,customer:customers(name),package:tour_packages(name)")).data as unknown as Booking[] ?? [],
  });

  const cells = useMemo(() => {
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon start
    const days = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  function bookingsOn(date: Date) {
    const iso = date.toISOString().slice(0, 10);
    return (data ?? []).filter((b) => {
      const s = b.start_date; const e = b.end_date ?? b.start_date;
      return iso >= s && iso <= e;
    });
  }

  const monthName = cursor.toLocaleString("en", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">Calendar</h1>
          <p className="text-muted-foreground">All departures at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <div className="min-w-[160px] text-center font-semibold">{monthName}</div>
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-24 rounded-lg bg-muted/20" />;
              const iso = d.toISOString().slice(0, 10);
              const bs = bookingsOn(d);
              return (
                <div key={i} className={cn("min-h-24 rounded-lg border p-1.5 text-xs", iso === today && "border-primary bg-primary/5")}>
                  <div className="mb-1 font-medium">{d.getDate()}</div>
                  <div className="space-y-1">
                    {bs.slice(0, 3).map(b => (
                      <Link key={b.id} to="/bookings/$id" params={{ id: b.id }} className="block truncate rounded bg-accent/60 px-1.5 py-0.5 text-accent-foreground hover:bg-accent">
                        {b.customer?.name ?? "Booking"}
                      </Link>
                    ))}
                    {bs.length > 3 && <div className="text-[10px] text-muted-foreground">+{bs.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Compass, Users, Package, Receipt, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen aurora-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </div>
          <span className="font-display text-2xl">Trekking Trails Travels</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" /> Built for Finland tour operators
          </div>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] text-primary sm:text-7xl">
            Run every booking under the northern lights.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Manage customers, tour packages, bookings and downloadable invoices — all in one calm,
            real-time workspace.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Customers", desc: "Full traveler contact history" },
            { icon: Package, title: "Tour packages", desc: "Price, seasons and itineraries" },
            { icon: Compass, title: "Bookings", desc: "Track status in real time" },
            { icon: Receipt, title: "Invoices", desc: "Generate and download PDFs" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card/70 p-5 shadow-soft backdrop-blur">
              <f.icon className="size-6 text-primary" />
              <div className="mt-4 font-semibold">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

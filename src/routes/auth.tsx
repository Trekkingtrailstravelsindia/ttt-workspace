import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth("google", {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen aurora-bg grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </div>
          <span className="font-display text-2xl">Trekking Trails Travels</span>
        </Link>
        <Card className="shadow-glow">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Workspace</CardTitle>
            <CardDescription>Staff portal for Trekking Trails Travels.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={google} variant="outline" className="w-full" disabled={loading}>
              Continue with Google
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" name="password" type="password" required minLength={6} autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Sign in</Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Need access? Ask an admin to add your account from the Team page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

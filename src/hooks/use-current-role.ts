import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "sales" | "ops";

export function useCurrentRole() {
  const { data, isLoading } = useQuery({
    queryKey: ["current-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { userId: null, roles: [] as AppRole[] };
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      return { userId: u.user.id, roles: (rows ?? []).map((r) => r.role as AppRole) };
    },
    staleTime: 60_000,
  });
  const roles = data?.roles ?? [];
  return {
    userId: data?.userId ?? null,
    roles,
    isAdmin: roles.includes("admin"),
    isOps: roles.includes("ops"),
    isSales: roles.includes("sales"),
    canSeeFinancials: roles.includes("admin") || roles.includes("ops"),
    isLoading,
  };
}

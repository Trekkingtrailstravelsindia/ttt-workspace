import { t as supabase } from "./client-CROz1RyC.js";
import { useQuery } from "@tanstack/react-query";
//#region src/hooks/use-current-role.ts
function useCurrentRole() {
	const { data, isLoading } = useQuery({
		queryKey: ["current-role"],
		queryFn: async () => {
			const { data: u } = await supabase.auth.getUser();
			if (!u.user) return {
				userId: null,
				roles: []
			};
			const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
			return {
				userId: u.user.id,
				roles: (rows ?? []).map((r) => r.role)
			};
		},
		staleTime: 6e4
	});
	const roles = data?.roles ?? [];
	return {
		userId: data?.userId ?? null,
		roles,
		isAdmin: roles.includes("admin"),
		isOps: roles.includes("ops"),
		isSales: roles.includes("sales"),
		canSeeFinancials: roles.includes("admin") || roles.includes("ops"),
		isLoading
	};
}
//#endregion
export { useCurrentRole as t };

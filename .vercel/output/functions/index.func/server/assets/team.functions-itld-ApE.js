import { d as TSS_SERVER_FUNCTION, t as createServerFn } from "./createServerFn-BFFE07zL.js";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.js";
import { z } from "zod";
//#region node_modules/@tanstack/start-server-core/dist/esm/createServerRpc.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/team.functions.ts?tss-serverfn-split
var RoleEnum = z.enum([
	"admin",
	"sales",
	"ops"
]);
async function requireAdmin(context) {
	const { data, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error("Admin only");
}
var listTeam_createServerFn_handler = createServerRpc({
	id: "128b2ec2c3172ddeca02bd88ad6bf21b284f17a70e914a6c66e9953e3b5c052a",
	name: "listTeam",
	filename: "src/lib/team.functions.ts"
}, (opts) => listTeam.__executeServer(opts));
var listTeam = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listTeam_createServerFn_handler, async ({ context }) => {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.js");
	const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
	if (error) throw new Error(error.message);
	const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
	const roleMap = /* @__PURE__ */ new Map();
	(roleRows ?? []).forEach((r) => {
		const arr = roleMap.get(r.user_id) ?? [];
		arr.push(r.role);
		roleMap.set(r.user_id, arr);
	});
	return data.users.map((u) => ({
		id: u.id,
		email: u.email ?? "",
		created_at: u.created_at,
		last_sign_in_at: u.last_sign_in_at ?? null,
		roles: roleMap.get(u.id) ?? []
	}));
});
var createTeamMember_createServerFn_handler = createServerRpc({
	id: "bba7b45680920c73a681c1a7ef18cd8f1e19a47f0d46cd7933ba80deebb8831b",
	name: "createTeamMember",
	filename: "src/lib/team.functions.ts"
}, (opts) => createTeamMember.__executeServer(opts));
var createTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({
	email: z.string().email(),
	password: z.string().min(6),
	role: RoleEnum.default("sales")
}).parse(data)).handler(createTeamMember_createServerFn_handler, async ({ data, context }) => {
	await requireAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.js");
	const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
		email: data.email,
		password: data.password,
		email_confirm: true
	});
	if (error) throw new Error(error.message);
	const uid = created.user?.id;
	if (uid) {
		await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
		await supabaseAdmin.from("user_roles").insert({
			user_id: uid,
			role: data.role
		});
	}
	return {
		id: uid ?? "",
		email: created.user?.email ?? ""
	};
});
var deleteTeamMember_createServerFn_handler = createServerRpc({
	id: "407ce10db9009b4a0a4b5159dd2d1c7f7dff23ceab11663cfdeb19d85423ac50",
	name: "deleteTeamMember",
	filename: "src/lib/team.functions.ts"
}, (opts) => deleteTeamMember.__executeServer(opts));
var deleteTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data)).handler(deleteTeamMember_createServerFn_handler, async ({ data, context }) => {
	await requireAdmin(context);
	if (data.id === context.userId) throw new Error("You cannot delete your own account.");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.js");
	const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var setTeamMemberRole_createServerFn_handler = createServerRpc({
	id: "a1f42dccdf6dc0bcf278ae78dd1cf4bd14d4b485c3ba021ccddd7937782beb91",
	name: "setTeamMemberRole",
	filename: "src/lib/team.functions.ts"
}, (opts) => setTeamMemberRole.__executeServer(opts));
var setTeamMemberRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({
	id: z.string().uuid(),
	role: RoleEnum
}).parse(data)).handler(setTeamMemberRole_createServerFn_handler, async ({ data, context }) => {
	await requireAdmin(context);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.js");
	await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
	const { error } = await supabaseAdmin.from("user_roles").insert({
		user_id: data.id,
		role: data.role
	});
	if (error) throw new Error(error.message);
	return { ok: true };
});
//#endregion
export { createTeamMember_createServerFn_handler, deleteTeamMember_createServerFn_handler, listTeam_createServerFn_handler, setTeamMemberRole_createServerFn_handler };

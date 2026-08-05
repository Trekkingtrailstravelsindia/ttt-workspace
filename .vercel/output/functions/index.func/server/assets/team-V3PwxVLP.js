import { d as TSS_SERVER_FUNCTION, t as createServerFn } from "./createServerFn-BFFE07zL.js";
import { t as getServerFnById } from "./__23tanstack-start-server-fn-resolver-fHSLVHtC.js";
import { t as requireSupabaseAuth } from "./auth-middleware-BwdutfJC.js";
import { t as useCurrentRole } from "./use-current-role-D3aft_Es.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import * as React from "react";
import { useState } from "react";
import { isRedirect, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
//#region node_modules/@tanstack/react-start/dist/esm/useServerFn.js
function useServerFn(serverFn) {
	const router = useRouter();
	return React.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
//#endregion
//#region node_modules/@tanstack/start-server-core/dist/esm/createSsrRpc.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/team.functions.ts
var RoleEnum = z.enum([
	"admin",
	"sales",
	"ops"
]);
var listTeam = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("128b2ec2c3172ddeca02bd88ad6bf21b284f17a70e914a6c66e9953e3b5c052a"));
var createTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({
	email: z.string().email(),
	password: z.string().min(6),
	role: RoleEnum.default("sales")
}).parse(data)).handler(createSsrRpc("bba7b45680920c73a681c1a7ef18cd8f1e19a47f0d46cd7933ba80deebb8831b"));
var deleteTeamMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data)).handler(createSsrRpc("407ce10db9009b4a0a4b5159dd2d1c7f7dff23ceab11663cfdeb19d85423ac50"));
var setTeamMemberRole = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({
	id: z.string().uuid(),
	role: RoleEnum
}).parse(data)).handler(createSsrRpc("a1f42dccdf6dc0bcf278ae78dd1cf4bd14d4b485c3ba021ccddd7937782beb91"));
//#endregion
//#region src/routes/_authenticated/team.tsx?tsr-split=component
var ROLES = [
	"admin",
	"sales",
	"ops"
];
function TeamPage() {
	const qc = useQueryClient();
	const { userId: currentId, isAdmin, isLoading: roleLoading } = useCurrentRole();
	const fetchTeam = useServerFn(listTeam);
	const create = useServerFn(createTeamMember);
	const remove = useServerFn(deleteTeamMember);
	const setRole = useServerFn(setTeamMemberRole);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRoleValue] = useState("sales");
	const { data: team = [], isLoading } = useQuery({
		queryKey: ["team"],
		queryFn: () => fetchTeam({}),
		enabled: isAdmin
	});
	const createMut = useMutation({
		mutationFn: () => create({ data: {
			email,
			password,
			role
		} }),
		onSuccess: () => {
			toast.success("Team member added");
			setEmail("");
			setPassword("");
			qc.invalidateQueries({ queryKey: ["team"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const removeMut = useMutation({
		mutationFn: (id) => remove({ data: { id } }),
		onSuccess: () => {
			toast.success("Removed");
			qc.invalidateQueries({ queryKey: ["team"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const roleMut = useMutation({
		mutationFn: (v) => setRole({ data: v }),
		onSuccess: () => {
			toast.success("Role updated");
			qc.invalidateQueries({ queryKey: ["team"] });
		},
		onError: (e) => toast.error(e.message)
	});
	if (roleLoading) return /* @__PURE__ */ jsx("div", {
		className: "py-12 text-center text-muted-foreground",
		children: "Loading…"
	});
	if (!isAdmin) return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "flex items-center gap-3 p-6 text-sm",
		children: [/* @__PURE__ */ jsx(ShieldAlert, { className: "size-5 text-destructive" }), "Admin access required. Ask a company admin to manage the team."]
	}) });
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx(Users, { className: "size-6 text-primary" }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-3xl",
					children: "Team"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground",
					children: "Add staff, assign roles (Admin, Sales, Ops), and remove access."
				})] })]
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs(CardTitle, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(UserPlus, { className: "size-5" }), " Add employee"]
			}), /* @__PURE__ */ jsx(CardDescription, { children: "They can sign in immediately with these credentials." })] }), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsxs("form", {
				onSubmit: (e) => {
					e.preventDefault();
					createMut.mutate();
				},
				className: "grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "new-email",
							children: "Work email"
						}), /* @__PURE__ */ jsx(Input, {
							id: "new-email",
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							placeholder: "staff@trekkingtrailstravels.com"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "new-pw",
							children: "Temporary password"
						}), /* @__PURE__ */ jsx(Input, {
							id: "new-pw",
							type: "text",
							required: true,
							minLength: 6,
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "min 6 characters"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(Label, { children: "Role" }), /* @__PURE__ */ jsxs(Select, {
							value: role,
							onValueChange: (v) => setRoleValue(v),
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: ROLES.map((r) => /* @__PURE__ */ jsx(SelectItem, {
								value: r,
								className: "capitalize",
								children: r
							}, r)) })]
						})]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						disabled: createMut.isPending,
						children: createMut.isPending ? "Adding..." : "Add"
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				className: "mt-3 text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ jsx("b", { children: "Admin" }),
					": full access incl. finance & team. ",
					/* @__PURE__ */ jsx("b", { children: "Ops" }),
					": all bookings & finance, no team. ",
					/* @__PURE__ */ jsx("b", { children: "Sales" }),
					": only their assigned leads/bookings, no financial totals."
				]
			})] })] }),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { children: [
				"All members (",
				team.length,
				")"
			] }) }), /* @__PURE__ */ jsx(CardContent, { children: isLoading ? /* @__PURE__ */ jsx("div", {
				className: "text-sm text-muted-foreground",
				children: "Loading..."
			}) : /* @__PURE__ */ jsx("div", {
				className: "divide-y",
				children: team.map((m) => /* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center justify-between gap-3 py-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "font-medium",
								children: [m.email, m.id === currentId && /* @__PURE__ */ jsx("span", {
									className: "ml-2 text-xs text-muted-foreground",
									children: "(you)"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted-foreground",
								children: ["Last sign-in: ", m.last_sign_in_at ? new Date(m.last_sign_in_at).toLocaleString() : "never"]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-1 flex flex-wrap gap-1",
								children: [m.roles.length === 0 && /* @__PURE__ */ jsx(Badge, {
									variant: "outline",
									children: "no role"
								}), m.roles.map((r) => /* @__PURE__ */ jsx(Badge, {
									variant: "secondary",
									className: "capitalize",
									children: r
								}, r))]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsxs(Select, {
							value: m.roles[0] ?? "sales",
							onValueChange: (v) => roleMut.mutate({
								id: m.id,
								role: v
							}),
							disabled: m.id === currentId,
							children: [/* @__PURE__ */ jsx(SelectTrigger, {
								className: "w-32",
								children: /* @__PURE__ */ jsx(SelectValue, {})
							}), /* @__PURE__ */ jsx(SelectContent, { children: ROLES.map((r) => /* @__PURE__ */ jsx(SelectItem, {
								value: r,
								className: "capitalize",
								children: r
							}, r)) })]
						}), /* @__PURE__ */ jsx(Button, {
							variant: "ghost",
							size: "icon",
							disabled: m.id === currentId || removeMut.isPending,
							onClick: () => {
								if (confirm(`Remove ${m.email}?`)) removeMut.mutate(m.id);
							},
							"aria-label": "Remove",
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
						})]
					})]
				}, m.id))
			}) })] })
		]
	});
}
//#endregion
export { TeamPage as component };

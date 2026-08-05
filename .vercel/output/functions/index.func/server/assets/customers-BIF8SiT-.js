import { t as supabase } from "./client-CROz1RyC.js";
import { t as LEAD_SOURCES } from "./customers-CG4iiMSn.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/customers.tsx?tsr-split=component
function CustomersPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["customers"],
		queryFn: async () => (await supabase.from("customers").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const [editing, setEditing] = useState(null);
	const [open, setOpen] = useState(false);
	async function save(form) {
		const { data: userData } = await supabase.auth.getUser();
		const payload = {
			user_id: userData.user.id,
			name: String(form.get("name")).trim(),
			email: form.get("email") || null,
			phone: form.get("phone") || null,
			country: form.get("country") || null,
			notes: form.get("notes") || null,
			lead_source: form.get("lead_source") || null,
			lost_reason: form.get("lost_reason") || null
		};
		if (!payload.name) return toast.error("Name is required");
		const { error } = editing ? await supabase.from("customers").update(payload).eq("id", editing.id) : await supabase.from("customers").insert(payload);
		if (error) return toast.error(error.message);
		toast.success(editing ? "Customer updated" : "Customer added");
		setOpen(false);
		setEditing(null);
		qc.invalidateQueries({ queryKey: ["customers"] });
		qc.invalidateQueries({ queryKey: ["dashboard"] });
	}
	async function remove(id) {
		if (!confirm("Delete this customer?")) return;
		const { error } = await supabase.from("customers").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		qc.invalidateQueries({ queryKey: ["customers"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Customers"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "All the travelers you work with."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: (o) => {
					setOpen(o);
					if (!o) setEditing(null);
				},
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add customer"] })
				}), /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit customer" : "New customer" }) }), /* @__PURE__ */ jsxs("form", {
					onSubmit: (e) => {
						e.preventDefault();
						save(new FormData(e.currentTarget));
					},
					className: "space-y-3",
					children: [
						/* @__PURE__ */ jsx(Field, {
							name: "name",
							label: "Full name",
							defaultValue: editing?.name,
							required: true
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ jsx(Field, {
								name: "email",
								type: "email",
								label: "Email",
								defaultValue: editing?.email ?? ""
							}), /* @__PURE__ */ jsx(Field, {
								name: "phone",
								label: "Phone",
								defaultValue: editing?.phone ?? ""
							})]
						}),
						/* @__PURE__ */ jsx(Field, {
							name: "country",
							label: "Country",
							defaultValue: editing?.country ?? ""
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "lead_source",
							children: "Lead source"
						}), /* @__PURE__ */ jsxs("select", {
							id: "lead_source",
							name: "lead_source",
							defaultValue: editing?.lead_source ?? "",
							className: "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm",
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "—"
							}), LEAD_SOURCES.map((s) => /* @__PURE__ */ jsx("option", {
								value: s,
								children: s
							}, s))]
						})] }),
						editing?.stage === "lost" && /* @__PURE__ */ jsx(Field, {
							name: "lost_reason",
							label: "Lost reason",
							defaultValue: editing?.lost_reason ?? "",
							placeholder: "e.g. Price too high, went with competitor"
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "notes",
							children: "Notes"
						}), /* @__PURE__ */ jsx(Textarea, {
							id: "notes",
							name: "notes",
							defaultValue: editing?.notes ?? "",
							rows: 3
						})] }),
						/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							children: "Save"
						}) })
					]
				})] })]
			})]
		}), isLoading ? /* @__PURE__ */ jsx("div", {
			className: "py-12 text-center text-muted-foreground",
			children: "Loading…"
		}) : !data?.length ? /* @__PURE__ */ jsx(EmptyState, { onAdd: () => setOpen(true) }) : /* @__PURE__ */ jsx("div", {
			className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
			children: data.map((c) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
				className: "p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("div", {
								className: "truncate font-semibold",
								children: c.name
							}), c.country && /* @__PURE__ */ jsx("div", {
								className: "text-xs text-muted-foreground",
								children: c.country
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => {
									setEditing(c);
									setOpen(true);
								},
								children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" })
							}), /* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => remove(c.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 space-y-1 text-sm text-muted-foreground",
						children: [
							c.email && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ jsx(Mail, { className: "size-3.5" }),
									" ",
									c.email
								]
							}),
							c.phone && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ jsx(Phone, { className: "size-3.5" }),
									" ",
									c.phone
								]
							}),
							c.country && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ jsx(Globe, { className: "size-3.5" }),
									" ",
									c.country
								]
							})
						]
					}),
					c.notes && /* @__PURE__ */ jsx("p", {
						className: "mt-3 line-clamp-2 text-sm",
						children: c.notes
					})
				]
			}) }, c.id))
		})]
	});
}
function Field({ label, name, ...rest }) {
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
		htmlFor: name,
		children: label
	}), /* @__PURE__ */ jsx(Input, {
		id: name,
		name,
		...rest
	})] });
}
function EmptyState({ onAdd }) {
	return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "py-16 text-center",
		children: [/* @__PURE__ */ jsx("p", {
			className: "mb-4 text-muted-foreground",
			children: "No customers yet."
		}), /* @__PURE__ */ jsxs(Button, {
			onClick: onAdd,
			children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add your first customer"]
		})]
	}) });
}
//#endregion
export { CustomersPage as component };

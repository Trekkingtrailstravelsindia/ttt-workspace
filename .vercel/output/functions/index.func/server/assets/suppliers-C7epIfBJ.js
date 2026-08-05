import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/suppliers.tsx?tsr-split=component
function SuppliersPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["suppliers"],
		queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? []
	});
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	async function save(f) {
		const { data: u } = await supabase.auth.getUser();
		const payload = {
			user_id: u.user.id,
			name: String(f.get("name")).trim(),
			category: f.get("category") || null,
			contact_person: f.get("contact_person") || null,
			email: f.get("email") || null,
			phone: f.get("phone") || null,
			notes: f.get("notes") || null
		};
		if (!payload.name) return toast.error("Name required");
		const { error } = editing ? await supabase.from("suppliers").update(payload).eq("id", editing.id) : await supabase.from("suppliers").insert(payload);
		if (error) return toast.error(error.message);
		toast.success("Saved");
		setOpen(false);
		setEditing(null);
		qc.invalidateQueries({ queryKey: ["suppliers"] });
	}
	async function remove(id) {
		if (!confirm("Delete supplier?")) return;
		const { error } = await supabase.from("suppliers").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["suppliers"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Suppliers"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "Hotels, transport, activities, igloo & train providers."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: (o) => {
					setOpen(o);
					if (!o) setEditing(null);
				},
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add supplier"] })
				}), /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit supplier" : "New supplier" }) }), /* @__PURE__ */ jsxs("form", {
					onSubmit: (e) => {
						e.preventDefault();
						save(new FormData(e.currentTarget));
					},
					className: "space-y-3",
					children: [
						/* @__PURE__ */ jsx(Field, {
							name: "name",
							label: "Company name",
							defaultValue: editing?.name,
							required: true
						}),
						/* @__PURE__ */ jsx(Field, {
							name: "category",
							label: "Category (Hotel, Transport, Activity, Igloo, Train…)",
							defaultValue: editing?.category ?? ""
						}),
						/* @__PURE__ */ jsx(Field, {
							name: "contact_person",
							label: "Contact person",
							defaultValue: editing?.contact_person ?? ""
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
		}) : !data?.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
			className: "py-16 text-center text-muted-foreground",
			children: "No suppliers yet."
		}) }) : /* @__PURE__ */ jsx("div", {
			className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
			children: data.map((s) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
				className: "p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold",
							children: s.name
						}), s.category && /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-1 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ jsx(Building2, { className: "size-3" }),
								" ",
								s.category
							]
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => {
									setEditing(s);
									setOpen(true);
								},
								children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" })
							}), /* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => remove(s.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 space-y-1 text-sm text-muted-foreground",
						children: [
							s.contact_person && /* @__PURE__ */ jsx("div", { children: s.contact_person }),
							s.email && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ jsx(Mail, { className: "size-3.5" }),
									" ",
									s.email
								]
							}),
							s.phone && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ jsx(Phone, { className: "size-3.5" }),
									" ",
									s.phone
								]
							})
						]
					}),
					s.notes && /* @__PURE__ */ jsx("p", {
						className: "mt-3 line-clamp-2 text-sm",
						children: s.notes
					})
				]
			}) }, s.id))
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
//#endregion
export { SuppliersPage as component };

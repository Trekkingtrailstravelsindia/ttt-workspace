import { t as supabase } from "./client-CROz1RyC.js";
import { t as cn } from "./utils-C_uf36nf.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import * as React from "react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
//#region src/components/ui/checkbox.tsx
var Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(CheckboxPrimitive.Root, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
//#endregion
//#region src/routes/_authenticated/tasks.tsx?tsr-split=component
function TasksPage() {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["tasks"],
		queryFn: async () => (await supabase.from("tasks").select("*, customer:customers(name)").order("due_date", {
			ascending: true,
			nullsFirst: false
		})).data ?? []
	});
	const { data: customers } = useQuery({
		queryKey: ["customers-lite"],
		queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? []
	});
	const [open, setOpen] = useState(false);
	async function save(f) {
		const { data: u } = await supabase.auth.getUser();
		const payload = {
			user_id: u.user.id,
			title: String(f.get("title")).trim(),
			description: f.get("description") || null,
			due_date: f.get("due_date") || null,
			priority: f.get("priority") || "medium",
			customer_id: f.get("customer_id") || null
		};
		if (!payload.title) return toast.error("Title required");
		const { error } = await supabase.from("tasks").insert(payload);
		if (error) return toast.error(error.message);
		setOpen(false);
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	async function toggle(t) {
		const newStatus = t.status === "done" ? "pending" : "done";
		const { error } = await supabase.from("tasks").update({
			status: newStatus,
			completed_at: newStatus === "done" ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", t.id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	async function remove(id) {
		if (!confirm("Delete task?")) return;
		await supabase.from("tasks").delete().eq("id", id);
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const overdue = (t) => t.status === "pending" && t.due_date && t.due_date < today;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Tasks & reminders"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "Follow-ups, calls, and due dates."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: setOpen,
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " New task"] })
				}), /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "New task" }) }), /* @__PURE__ */ jsxs("form", {
					onSubmit: (e) => {
						e.preventDefault();
						save(new FormData(e.currentTarget));
					},
					className: "space-y-3",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "title",
							children: "Title"
						}), /* @__PURE__ */ jsx(Input, {
							id: "title",
							name: "title",
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "description",
							children: "Details"
						}), /* @__PURE__ */ jsx(Textarea, {
							id: "description",
							name: "description",
							rows: 3
						})] }),
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "due_date",
								children: "Due date"
							}), /* @__PURE__ */ jsx(Input, {
								id: "due_date",
								name: "due_date",
								type: "date"
							})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Priority" }), /* @__PURE__ */ jsxs(Select, {
								name: "priority",
								defaultValue: "medium",
								children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: [
									"low",
									"medium",
									"high"
								].map((p) => /* @__PURE__ */ jsx(SelectItem, {
									value: p,
									children: p
								}, p)) })]
							})] })]
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Link to customer (optional)" }), /* @__PURE__ */ jsxs(Select, {
							name: "customer_id",
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ jsx(SelectContent, { children: (customers ?? []).map((c) => /* @__PURE__ */ jsx(SelectItem, {
								value: c.id,
								children: c.name
							}, c.id)) })]
						})] }),
						/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							children: "Create"
						}) })
					]
				})] })]
			})]
		}), !data?.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
			className: "py-16 text-center text-muted-foreground",
			children: "No tasks yet."
		}) }) : /* @__PURE__ */ jsx("div", {
			className: "space-y-2",
			children: data.map((t) => /* @__PURE__ */ jsx(Card, {
				className: t.status === "done" ? "opacity-60" : "",
				children: /* @__PURE__ */ jsxs(CardContent, {
					className: "flex items-start gap-3 p-4",
					children: [
						/* @__PURE__ */ jsx(Checkbox, {
							checked: t.status === "done",
							onCheckedChange: () => toggle(t),
							className: "mt-1"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "font-medium " + (t.status === "done" ? "line-through" : ""),
									children: t.title
								}),
								t.description && /* @__PURE__ */ jsx("div", {
									className: "text-sm text-muted-foreground",
									children: t.description
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
									children: [
										t.due_date && /* @__PURE__ */ jsxs("span", {
											className: "flex items-center gap-1 " + (overdue(t) ? "text-destructive font-medium" : ""),
											children: [
												/* @__PURE__ */ jsx(CalendarClock, { className: "size-3" }),
												" ",
												t.due_date,
												overdue(t) ? " (overdue)" : ""
											]
										}),
										/* @__PURE__ */ jsx(Badge, {
											variant: "secondary",
											className: t.priority === "high" ? "bg-destructive/10 text-destructive" : t.priority === "medium" ? "bg-accent/60" : "bg-muted",
											children: t.priority
										}),
										t.customer?.name && /* @__PURE__ */ jsxs("span", { children: ["· ", t.customer.name] })
									]
								})
							]
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "icon",
							variant: "ghost",
							onClick: () => remove(t.id),
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
						})
					]
				})
			}, t.id))
		})]
	});
}
//#endregion
export { TasksPage as component };

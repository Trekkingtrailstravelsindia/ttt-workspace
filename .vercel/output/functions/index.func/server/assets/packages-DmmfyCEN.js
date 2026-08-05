import { t as supabase } from "./client-CROz1RyC.js";
import { t as cn } from "./utils-C_uf36nf.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import * as React from "react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as SwitchPrimitives from "@radix-ui/react-switch";
//#region src/components/ui/switch.tsx
var Switch = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SwitchPrimitives.Root, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ jsx(SwitchPrimitives.Thumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = SwitchPrimitives.Root.displayName;
//#endregion
//#region src/routes/_authenticated/packages.tsx?tsr-split=component
function PackagesPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["packages"],
		queryFn: async () => (await supabase.from("tour_packages").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const [editing, setEditing] = useState(null);
	const [open, setOpen] = useState(false);
	async function save(form) {
		const { data: userData } = await supabase.auth.getUser();
		const payload = {
			user_id: userData.user.id,
			name: String(form.get("name")).trim(),
			description: form.get("description") || null,
			duration_days: Number(form.get("duration_days")) || 1,
			price_per_person: Number(form.get("price_per_person")) || 0,
			location: form.get("location") || null,
			season: form.get("season") || null,
			active: form.get("active") === "on"
		};
		if (!payload.name) return toast.error("Name required");
		const { error } = editing ? await supabase.from("tour_packages").update(payload).eq("id", editing.id) : await supabase.from("tour_packages").insert(payload);
		if (error) return toast.error(error.message);
		toast.success(editing ? "Package updated" : "Package added");
		setOpen(false);
		setEditing(null);
		qc.invalidateQueries({ queryKey: ["packages"] });
		qc.invalidateQueries({ queryKey: ["dashboard"] });
	}
	async function remove(id) {
		if (!confirm("Delete this package?")) return;
		const { error } = await supabase.from("tour_packages").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		qc.invalidateQueries({ queryKey: ["packages"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Tour packages"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "Your catalog of Finland experiences."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: (o) => {
					setOpen(o);
					if (!o) setEditing(null);
				},
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add package"] })
				}), /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit package" : "New package" }) }), /* @__PURE__ */ jsxs("form", {
					onSubmit: (e) => {
						e.preventDefault();
						save(new FormData(e.currentTarget));
					},
					className: "space-y-3",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "name",
							children: "Name"
						}), /* @__PURE__ */ jsx(Input, {
							id: "name",
							name: "name",
							required: true,
							defaultValue: editing?.name,
							placeholder: "Northern Lights Rovaniemi Escape"
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "description",
							children: "Description"
						}), /* @__PURE__ */ jsx(Textarea, {
							id: "description",
							name: "description",
							defaultValue: editing?.description ?? "",
							rows: 3
						})] }),
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "duration_days",
									children: "Duration (days)"
								}), /* @__PURE__ */ jsx(Input, {
									id: "duration_days",
									name: "duration_days",
									type: "number",
									min: 1,
									defaultValue: editing?.duration_days ?? 3
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "price_per_person",
									children: "Price / person (€)"
								}), /* @__PURE__ */ jsx(Input, {
									id: "price_per_person",
									name: "price_per_person",
									type: "number",
									min: 0,
									step: "0.01",
									defaultValue: editing?.price_per_person ?? 0
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "location",
									children: "Location"
								}), /* @__PURE__ */ jsx(Input, {
									id: "location",
									name: "location",
									defaultValue: editing?.location ?? "",
									placeholder: "Lapland"
								})] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "season",
									children: "Season"
								}), /* @__PURE__ */ jsx(Input, {
									id: "season",
									name: "season",
									defaultValue: editing?.season ?? "",
									placeholder: "Winter"
								})] })
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between rounded-lg border p-3",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "active",
								children: "Active"
							}), /* @__PURE__ */ jsx("div", {
								className: "text-xs text-muted-foreground",
								children: "Available for new bookings"
							})] }), /* @__PURE__ */ jsx(Switch, {
								id: "active",
								name: "active",
								defaultChecked: editing?.active ?? true
							})]
						}),
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
		}) : !data?.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
			className: "py-16 text-center",
			children: [/* @__PURE__ */ jsx("p", {
				className: "mb-4 text-muted-foreground",
				children: "No packages yet."
			}), /* @__PURE__ */ jsxs(Button, {
				onClick: () => setOpen(true),
				children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add package"]
			})]
		}) }) : /* @__PURE__ */ jsx("div", {
			className: "grid gap-3 md:grid-cols-2",
			children: data.map((p) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
				className: "p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsx("div", {
									className: "truncate text-lg font-semibold",
									children: p.name
								}), !p.active && /* @__PURE__ */ jsx(Badge, {
									variant: "secondary",
									children: "Inactive"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground",
								children: [
									p.location && /* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ jsx(MapPin, { className: "size-3" }), p.location]
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1",
										children: [
											/* @__PURE__ */ jsx(Clock, { className: "size-3" }),
											p.duration_days,
											" day",
											p.duration_days > 1 ? "s" : ""
										]
									}),
									p.season && /* @__PURE__ */ jsxs("span", { children: ["· ", p.season] })
								]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => {
									setEditing(p);
									setOpen(true);
								},
								children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" })
							}), /* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => remove(p.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
							})]
						})]
					}),
					p.description && /* @__PURE__ */ jsx("p", {
						className: "mt-3 line-clamp-2 text-sm text-muted-foreground",
						children: p.description
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4 flex items-baseline justify-between",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-xs uppercase tracking-wide text-muted-foreground",
							children: "From"
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-2xl font-semibold text-primary",
							children: [
								"€",
								Number(p.price_per_person).toFixed(0),
								/* @__PURE__ */ jsx("span", {
									className: "text-sm text-muted-foreground",
									children: "/pp"
								})
							]
						})]
					})
				]
			}) }, p.id))
		})]
	});
}
//#endregion
export { PackagesPage as component };

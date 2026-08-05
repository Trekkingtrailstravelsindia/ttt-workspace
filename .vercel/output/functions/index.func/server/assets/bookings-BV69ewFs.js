import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/bookings.tsx?tsr-split=component
function BookingsPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["bookings"],
		queryFn: async () => (await supabase.from("bookings").select("*, customer:customers(name), package:tour_packages(name, price_per_person, duration_days)").order("start_date", { ascending: false })).data ?? []
	});
	const { data: customers } = useQuery({
		queryKey: ["customers-lite"],
		queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? []
	});
	const { data: packages } = useQuery({
		queryKey: ["packages-lite"],
		queryFn: async () => (await supabase.from("tour_packages").select("id,name,price_per_person,duration_days").eq("active", true).order("name")).data ?? []
	});
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	useEffect(() => {
		const ch = supabase.channel("bookings-rt").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "bookings"
		}, () => {
			qc.invalidateQueries({ queryKey: ["bookings"] });
			qc.invalidateQueries({ queryKey: ["dashboard"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [qc]);
	async function remove(id) {
		if (!confirm("Delete this booking?")) return;
		const { error } = await supabase.from("bookings").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		qc.invalidateQueries({ queryKey: ["bookings"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-4xl text-primary",
					children: "Bookings"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground",
					children: "Real-time booking pipeline."
				})] }), /* @__PURE__ */ jsxs(Button, {
					onClick: () => {
						setEditing(null);
						setOpen(true);
					},
					children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " New booking"]
				})]
			}),
			/* @__PURE__ */ jsx(BookingDialog, {
				open,
				onOpenChange: setOpen,
				editing,
				customers: customers ?? [],
				packages: packages ?? [],
				onSaved: () => {
					qc.invalidateQueries({ queryKey: ["bookings"] });
					qc.invalidateQueries({ queryKey: ["dashboard"] });
				}
			}),
			isLoading ? /* @__PURE__ */ jsx("div", {
				className: "py-12 text-center text-muted-foreground",
				children: "Loading…"
			}) : !data?.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
				className: "py-16 text-center",
				children: /* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground",
					children: "No bookings yet."
				})
			}) }) : /* @__PURE__ */ jsx("div", {
				className: "space-y-3",
				children: data.map((b) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
					className: "flex flex-wrap items-center justify-between gap-4 p-5",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx("div", {
										className: "truncate font-semibold",
										children: b.customer?.name ?? "—"
									}), /* @__PURE__ */ jsx(StatusBadge, { status: b.status })]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "text-sm text-muted-foreground",
									children: b.package?.name
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1",
										children: [
											/* @__PURE__ */ jsx(Calendar, { className: "size-3" }),
											b.start_date,
											b.end_date ? ` → ${b.end_date}` : ""
										]
									}), /* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ jsx(Users, { className: "size-3" }), b.travelers]
									})]
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "text-right",
							children: /* @__PURE__ */ jsxs("div", {
								className: "text-lg font-semibold text-primary",
								children: ["€", Number(b.total_amount).toFixed(0)]
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex gap-1",
							children: [
								/* @__PURE__ */ jsx(Button, {
									asChild: true,
									size: "icon",
									variant: "ghost",
									children: /* @__PURE__ */ jsx(Link, {
										to: "/bookings/$id",
										params: { id: b.id },
										children: /* @__PURE__ */ jsx(Eye, { className: "size-4" })
									})
								}),
								/* @__PURE__ */ jsx(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => {
										setEditing(b);
										setOpen(true);
									},
									children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" })
								}),
								/* @__PURE__ */ jsx(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => remove(b.id),
									children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
								})
							]
						})
					]
				}) }, b.id))
			})
		]
	});
}
function StatusBadge({ status }) {
	return /* @__PURE__ */ jsx(Badge, {
		className: {
			inquiry: "bg-muted text-muted-foreground",
			quoted: "bg-primary/10 text-primary",
			deposit_paid: "bg-warning/20 text-warning-foreground",
			confirmed: "bg-accent text-accent-foreground",
			travelling: "bg-primary text-primary-foreground",
			completed: "bg-success text-success-foreground",
			cancelled: "bg-destructive/10 text-destructive"
		}[status] ?? "bg-muted",
		variant: "secondary",
		children: status.replace("_", " ")
	});
}
function BookingDialog({ open, onOpenChange, editing, customers, packages, onSaved }) {
	const [customerId, setCustomerId] = useState(editing?.customer_id ?? "");
	const [packageId, setPackageId] = useState(editing?.package_id ?? "");
	const [travelers, setTravelers] = useState(editing?.travelers ?? 1);
	const [startDate, setStartDate] = useState(editing?.start_date ?? "");
	const [endDate, setEndDate] = useState(editing?.end_date ?? "");
	const [status, setStatus] = useState(editing?.status ?? "inquiry");
	const [notes, setNotes] = useState(editing?.notes ?? "");
	const [totalOverride, setTotalOverride] = useState(editing ? String(editing.total_amount) : "");
	useEffect(() => {
		if (!open) return;
		setCustomerId(editing?.customer_id ?? "");
		setPackageId(editing?.package_id ?? "");
		setTravelers(editing?.travelers ?? 1);
		setStartDate(editing?.start_date ?? "");
		setEndDate(editing?.end_date ?? "");
		setStatus(editing?.status ?? "inquiry");
		setNotes(editing?.notes ?? "");
		setTotalOverride(editing ? String(editing.total_amount) : "");
	}, [open, editing]);
	const pkg = packages.find((p) => p.id === packageId);
	const computedTotal = useMemo(() => pkg ? pkg.price_per_person * travelers : 0, [pkg, travelers]);
	useEffect(() => {
		if (!editing && pkg && startDate) {
			const d = new Date(startDate);
			d.setDate(d.getDate() + (pkg.duration_days - 1));
			setEndDate(d.toISOString().slice(0, 10));
		}
	}, [
		pkg,
		startDate,
		editing
	]);
	useEffect(() => {
		if (!editing) setTotalOverride(String(computedTotal));
	}, [computedTotal, editing]);
	async function submit(e) {
		e.preventDefault();
		if (!customerId || !packageId || !startDate) return toast.error("Customer, package and start date required");
		const { data: userData } = await supabase.auth.getUser();
		const payload = {
			user_id: userData.user.id,
			customer_id: customerId,
			package_id: packageId,
			start_date: startDate,
			end_date: endDate || null,
			travelers,
			status,
			notes: notes || null,
			total_amount: Number(totalOverride) || 0
		};
		const { error } = editing ? await supabase.from("bookings").update(payload).eq("id", editing.id) : await supabase.from("bookings").insert(payload);
		if (error) return toast.error(error.message);
		toast.success(editing ? "Booking updated" : "Booking created");
		onOpenChange(false);
		onSaved();
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "max-h-[90vh] overflow-y-auto",
			children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit booking" : "New booking" }) }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Customer" }), /* @__PURE__ */ jsxs(Select, {
						value: customerId,
						onValueChange: setCustomerId,
						children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select customer" }) }), /* @__PURE__ */ jsx(SelectContent, { children: customers.map((c) => /* @__PURE__ */ jsx(SelectItem, {
							value: c.id,
							children: c.name
						}, c.id)) })]
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Package" }), /* @__PURE__ */ jsxs(Select, {
						value: packageId,
						onValueChange: setPackageId,
						children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select package" }) }), /* @__PURE__ */ jsx(SelectContent, { children: packages.map((p) => /* @__PURE__ */ jsxs(SelectItem, {
							value: p.id,
							children: [
								p.name,
								" — €",
								p.price_per_person
							]
						}, p.id)) })]
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "start",
								children: "Start date"
							}), /* @__PURE__ */ jsx(Input, {
								id: "start",
								type: "date",
								value: startDate,
								onChange: (e) => setStartDate(e.target.value),
								required: true
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "end",
								children: "End date"
							}), /* @__PURE__ */ jsx(Input, {
								id: "end",
								type: "date",
								value: endDate,
								onChange: (e) => setEndDate(e.target.value)
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "tr",
								children: "Travelers"
							}), /* @__PURE__ */ jsx(Input, {
								id: "tr",
								type: "number",
								min: 1,
								value: travelers,
								onChange: (e) => setTravelers(Number(e.target.value) || 1)
							})] })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Status" }), /* @__PURE__ */ jsxs(Select, {
							value: status,
							onValueChange: (v) => setStatus(v),
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsxs(SelectContent, { children: [
								/* @__PURE__ */ jsx(SelectItem, {
									value: "inquiry",
									children: "Inquiry"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "quoted",
									children: "Quoted"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "deposit_paid",
									children: "Deposit paid"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "confirmed",
									children: "Confirmed"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "travelling",
									children: "Travelling"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "completed",
									children: "Completed"
								}),
								/* @__PURE__ */ jsx(SelectItem, {
									value: "cancelled",
									children: "Cancelled"
								})
							] })]
						})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "total",
							children: "Total (€)"
						}), /* @__PURE__ */ jsx(Input, {
							id: "total",
							type: "number",
							min: 0,
							step: "0.01",
							value: totalOverride,
							onChange: (e) => setTotalOverride(e.target.value)
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "notes",
						children: "Notes"
					}), /* @__PURE__ */ jsx(Textarea, {
						id: "notes",
						value: notes,
						onChange: (e) => setNotes(e.target.value),
						rows: 3
					})] }),
					/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Save booking"
					}) })
				]
			})]
		})
	});
}
//#endregion
export { BookingsPage as component };

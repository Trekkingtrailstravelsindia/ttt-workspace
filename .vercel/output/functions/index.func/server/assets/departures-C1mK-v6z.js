import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/departures.tsx?tsr-split=component
function DeparturesPage() {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const { data: packages = [] } = useQuery({
		queryKey: ["packages-basic"],
		queryFn: async () => (await supabase.from("tour_packages").select("id, name").order("name")).data ?? []
	});
	const { data: departures = [] } = useQuery({
		queryKey: ["departures"],
		queryFn: async () => (await supabase.from("package_departures").select("*").order("departure_date", { ascending: true })).data ?? []
	});
	const { data: bookings = [] } = useQuery({
		queryKey: ["bookings-for-dep"],
		queryFn: async () => (await supabase.from("bookings").select("package_id, start_date, travelers, status").neq("status", "cancelled")).data ?? []
	});
	const pkgById = new Map(packages.map((p) => [p.id, p]));
	const bookedCount = useMemo(() => {
		const m = /* @__PURE__ */ new Map();
		bookings.forEach((b) => {
			const k = `${b.package_id}|${b.start_date}`;
			m.set(k, (m.get(k) ?? 0) + Number(b.travelers ?? 0));
		});
		return m;
	}, [bookings]);
	async function remove(id) {
		if (!confirm("Delete this departure?")) return;
		const { error } = await supabase.from("package_departures").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["departures"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
				className: "font-display text-3xl text-primary flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(CalendarClock, { className: "size-7" }), " Departures"]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Fixed departure dates & seat capacity per package."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: setOpen,
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add departure"] })
				}), /* @__PURE__ */ jsx(DepartureDialog, {
					packages,
					onSaved: () => {
						setOpen(false);
						qc.invalidateQueries({ queryKey: ["departures"] });
					}
				})]
			})]
		}), departures.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
			className: "py-12 text-center text-muted-foreground",
			children: "No departures scheduled yet."
		}) }) : /* @__PURE__ */ jsx("div", {
			className: "grid gap-3 md:grid-cols-2 lg:grid-cols-3",
			children: departures.map((d) => {
				const pkg = pkgById.get(d.package_id);
				const booked = bookedCount.get(`${d.package_id}|${d.departure_date}`) ?? 0;
				const remaining = Math.max(0, (d.capacity ?? 0) - booked);
				const soldOut = remaining <= 0 && d.capacity > 0;
				return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
					className: "p-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "text-xs uppercase tracking-wide text-muted-foreground",
									children: pkg?.name ?? "Package"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "font-display text-lg text-primary",
									children: new Date(d.departure_date).toLocaleDateString(void 0, {
										weekday: "short",
										day: "numeric",
										month: "short",
										year: "numeric"
									})
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1 flex flex-wrap gap-1",
									children: [/* @__PURE__ */ jsxs(Badge, {
										variant: soldOut ? "destructive" : "secondary",
										children: [
											booked,
											"/",
											d.capacity,
											" booked"
										]
									}), !soldOut && /* @__PURE__ */ jsxs(Badge, {
										variant: "outline",
										children: [remaining, " left"]
									})]
								}),
								d.notes && /* @__PURE__ */ jsx("div", {
									className: "mt-2 text-xs text-muted-foreground",
									children: d.notes
								})
							]
						}), /* @__PURE__ */ jsx(Button, {
							size: "icon",
							variant: "ghost",
							onClick: () => remove(d.id),
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
						})]
					})
				}) }, d.id);
			})
		})]
	});
}
function DepartureDialog({ packages, onSaved }) {
	const [packageId, setPackageId] = useState("");
	const [date, setDate] = useState("");
	const [capacity, setCapacity] = useState("10");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	async function submit(e) {
		e.preventDefault();
		if (!packageId || !date) return toast.error("Package and date required");
		setSaving(true);
		const { error } = await supabase.from("package_departures").insert({
			package_id: packageId,
			departure_date: date,
			capacity: Number(capacity) || 0,
			notes: notes.trim() || null
		});
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success("Departure added");
		onSaved();
	}
	return /* @__PURE__ */ jsxs(DialogContent, { children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "New departure" }) }), /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "space-y-3",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Package" }), /* @__PURE__ */ jsxs(Select, {
				value: packageId,
				onValueChange: setPackageId,
				children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select package" }) }), /* @__PURE__ */ jsx(SelectContent, { children: packages.map((p) => /* @__PURE__ */ jsx(SelectItem, {
					value: p.id,
					children: p.name
				}, p.id)) })]
			})] }),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Departure date" }), /* @__PURE__ */ jsx(Input, {
					type: "date",
					value: date,
					onChange: (e) => setDate(e.target.value),
					required: true
				})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Capacity" }), /* @__PURE__ */ jsx(Input, {
					type: "number",
					min: 0,
					value: capacity,
					onChange: (e) => setCapacity(e.target.value)
				})] })]
			}),
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Notes" }), /* @__PURE__ */ jsx(Input, {
				value: notes,
				onChange: (e) => setNotes(e.target.value),
				maxLength: 200
			})] }),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				className: "w-full",
				disabled: saving,
				children: "Add departure"
			})
		]
	})] });
}
//#endregion
export { DeparturesPage as component };

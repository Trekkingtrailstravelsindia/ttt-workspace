import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, o as DialogTrigger, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/rate-cards.tsx?tsr-split=component
var RATE_TYPES = [
	{
		value: "per_unit",
		label: "Per unit"
	},
	{
		value: "per_night",
		label: "Per night"
	},
	{
		value: "per_pax",
		label: "Per person"
	},
	{
		value: "per_trip",
		label: "Per trip"
	},
	{
		value: "per_hour",
		label: "Per hour"
	}
];
function RateCardsPage() {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const { data: suppliers = [] } = useQuery({
		queryKey: ["suppliers-basic"],
		queryFn: async () => (await supabase.from("suppliers").select("id, name, category").order("name")).data ?? []
	});
	const { data: rates = [] } = useQuery({
		queryKey: ["supplier-rates"],
		queryFn: async () => (await supabase.from("supplier_rates").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const supplierById = new Map(suppliers.map((s) => [s.id, s]));
	async function remove(id) {
		if (!confirm("Delete this rate?")) return;
		const { error } = await supabase.from("supplier_rates").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["supplier-rates"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
				className: "font-display text-3xl text-primary flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(Tags, { className: "size-7" }), " Rate cards"]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground",
				children: "Store supplier prices so cost estimation stays consistent."
			})] }), /* @__PURE__ */ jsxs(Dialog, {
				open,
				onOpenChange: (o) => {
					setOpen(o);
					if (!o) setEditing(null);
				},
				children: [/* @__PURE__ */ jsx(DialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsxs(Button, { children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add rate"] })
				}), /* @__PURE__ */ jsx(RateDialog, {
					editing,
					suppliers,
					onSaved: () => {
						setOpen(false);
						setEditing(null);
						qc.invalidateQueries({ queryKey: ["supplier-rates"] });
					}
				})]
			})]
		}), rates.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
			className: "py-12 text-center text-muted-foreground",
			children: "No rates yet. Add supplier rates so estimates auto-fill."
		}) }) : /* @__PURE__ */ jsx("div", {
			className: "grid gap-3 md:grid-cols-2",
			children: rates.map((r) => {
				const s = supplierById.get(r.supplier_id);
				return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
					className: "p-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "text-xs uppercase tracking-wide text-muted-foreground",
									children: [
										s?.name ?? "Unknown supplier",
										" ",
										s?.category ? `· ${s.category}` : ""
									]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "font-medium",
									children: r.service_name
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1 flex flex-wrap gap-1",
									children: [/* @__PURE__ */ jsx(Badge, {
										variant: "secondary",
										children: RATE_TYPES.find((t) => t.value === r.rate_type)?.label ?? r.rate_type
									}), r.season_start && /* @__PURE__ */ jsxs(Badge, {
										variant: "outline",
										children: [
											r.season_start,
											" → ",
											r.season_end
										]
									})]
								}),
								r.notes && /* @__PURE__ */ jsx("div", {
									className: "mt-2 text-xs text-muted-foreground",
									children: r.notes
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-right shrink-0",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "font-semibold text-primary",
								children: [
									r.currency,
									" ",
									Number(r.amount).toFixed(2)
								]
							}), /* @__PURE__ */ jsxs("div", {
								className: "mt-2 flex justify-end gap-1",
								children: [/* @__PURE__ */ jsx(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setEditing(r);
										setOpen(true);
									},
									children: "Edit"
								}), /* @__PURE__ */ jsx(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => remove(r.id),
									children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
								})]
							})]
						})]
					})
				}) }, r.id);
			})
		})]
	});
}
function RateDialog({ editing, suppliers, onSaved }) {
	const [supplierId, setSupplierId] = useState(editing?.supplier_id ?? "");
	const [serviceName, setServiceName] = useState(editing?.service_name ?? "");
	const [rateType, setRateType] = useState(editing?.rate_type ?? "per_unit");
	const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
	const [currency, setCurrency] = useState(editing?.currency ?? "EUR");
	const [seasonStart, setSeasonStart] = useState(editing?.season_start ?? "");
	const [seasonEnd, setSeasonEnd] = useState(editing?.season_end ?? "");
	const [notes, setNotes] = useState(editing?.notes ?? "");
	const [saving, setSaving] = useState(false);
	async function submit(e) {
		e.preventDefault();
		if (!supplierId || !serviceName) return toast.error("Supplier and service required");
		setSaving(true);
		const payload = {
			supplier_id: supplierId,
			service_name: serviceName.trim(),
			rate_type: rateType,
			amount: Number(amount) || 0,
			currency,
			season_start: seasonStart || null,
			season_end: seasonEnd || null,
			notes: notes.trim() || null
		};
		const { error } = editing ? await supabase.from("supplier_rates").update(payload).eq("id", editing.id) : await supabase.from("supplier_rates").insert(payload);
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success("Saved");
		onSaved();
	}
	return /* @__PURE__ */ jsxs(DialogContent, {
		className: "max-h-[90vh] overflow-y-auto",
		children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Edit rate" : "New rate" }) }), /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			className: "space-y-3",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Supplier" }), /* @__PURE__ */ jsxs(Select, {
					value: supplierId,
					onValueChange: setSupplierId,
					children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select supplier" }) }), /* @__PURE__ */ jsx(SelectContent, { children: suppliers.map((s) => /* @__PURE__ */ jsx(SelectItem, {
						value: s.id,
						children: s.name
					}, s.id)) })]
				})] }),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Service name" }), /* @__PURE__ */ jsx(Input, {
					value: serviceName,
					onChange: (e) => setServiceName(e.target.value),
					placeholder: "e.g. Glass igloo double",
					required: true,
					maxLength: 120
				})] }),
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-3 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Rate type" }), /* @__PURE__ */ jsxs(Select, {
							value: rateType,
							onValueChange: setRateType,
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: RATE_TYPES.map((t) => /* @__PURE__ */ jsx(SelectItem, {
								value: t.value,
								children: t.label
							}, t.value)) })]
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Amount" }), /* @__PURE__ */ jsx(Input, {
							type: "number",
							min: 0,
							step: "0.01",
							value: amount,
							onChange: (e) => setAmount(e.target.value),
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Currency" }), /* @__PURE__ */ jsx(Input, {
							value: currency,
							onChange: (e) => setCurrency(e.target.value.toUpperCase()),
							maxLength: 3
						})] })
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-3 sm:grid-cols-2",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Season starts (opt.)" }), /* @__PURE__ */ jsx(Input, {
						type: "date",
						value: seasonStart,
						onChange: (e) => setSeasonStart(e.target.value)
					})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Season ends (opt.)" }), /* @__PURE__ */ jsx(Input, {
						type: "date",
						value: seasonEnd,
						onChange: (e) => setSeasonEnd(e.target.value)
					})] })]
				}),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Notes" }), /* @__PURE__ */ jsx(Textarea, {
					value: notes,
					onChange: (e) => setNotes(e.target.value),
					rows: 2,
					maxLength: 500
				})] }),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					className: "w-full",
					disabled: saving,
					children: editing ? "Save" : "Add rate"
				})
			]
		})]
	});
}
//#endregion
export { RateCardsPage as component };

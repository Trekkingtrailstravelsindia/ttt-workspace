import { t as supabase } from "./client-CROz1RyC.js";
import { t as useCurrentRole } from "./use-current-role-D3aft_Es.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/cash-flow.tsx?tsr-split=component
var FX_TO_EUR = {
	EUR: 1,
	USD: .92,
	GBP: 1.17,
	INR: .011
};
var toEUR = (amount, currency, fx) => amount * (fx && fx > 0 ? Number(fx) : FX_TO_EUR[currency] ?? 1);
function CashFlow() {
	const { canSeeFinancials } = useCurrentRole();
	const qc = useQueryClient();
	const [horizon, setHorizon] = useState("60");
	const { data: installments = [] } = useQuery({
		queryKey: ["cf-installments"],
		queryFn: async () => (await supabase.from("booking_installments").select("*").order("due_date")).data ?? []
	});
	const { data: payables = [] } = useQuery({
		queryKey: ["cf-payables"],
		queryFn: async () => (await supabase.from("supplier_payables").select("*, supplier:suppliers(name)").order("due_date")).data ?? []
	});
	const { data: commissions = [] } = useQuery({
		queryKey: ["cf-commissions"],
		queryFn: async () => (await supabase.from("commissions").select("*").order("created_at")).data ?? []
	});
	const { data: suppliers = [] } = useQuery({
		queryKey: ["cf-suppliers"],
		queryFn: async () => (await supabase.from("suppliers").select("id,name").order("name")).data ?? []
	});
	const buckets = useMemo(() => {
		const days = Number(horizon);
		const today = /* @__PURE__ */ new Date();
		today.setHours(0, 0, 0, 0);
		const end = new Date(today);
		end.setDate(end.getDate() + days);
		const inflowsAll = installments.filter((i) => !i.paid && new Date(i.due_date) <= end).map((i) => ({
			...i,
			eur: toEUR(Number(i.amount), i.currency)
		}));
		const outflowsAll = [...payables.filter((p) => !p.paid && new Date(p.due_date) <= end).map((p) => ({
			kind: "payable",
			...p,
			eur: toEUR(Number(p.amount), p.currency)
		})), ...commissions.filter((c) => c.status !== "paid").map((c) => ({
			kind: "commission",
			...c,
			due_date: c.created_at.slice(0, 10),
			eur: toEUR(Number(c.amount), c.currency)
		}))];
		const overdueIn = inflowsAll.filter((i) => new Date(i.due_date) < today);
		const upcomingIn = inflowsAll.filter((i) => new Date(i.due_date) >= today);
		const overdueOut = outflowsAll.filter((o) => new Date(o.due_date) < today);
		const upcomingOut = outflowsAll.filter((o) => new Date(o.due_date) >= today);
		const sum = (arr) => arr.reduce((s, x) => s + Number(x.eur), 0);
		return {
			inflowsAll,
			outflowsAll,
			overdueIn,
			upcomingIn,
			overdueOut,
			upcomingOut,
			totalIn: sum(inflowsAll),
			totalOut: sum(outflowsAll),
			net: sum(inflowsAll) - sum(outflowsAll)
		};
	}, [
		installments,
		payables,
		commissions,
		horizon
	]);
	if (!canSeeFinancials) return /* @__PURE__ */ jsx("div", {
		className: "py-12 text-center text-muted-foreground",
		children: "You do not have access to financial data."
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-3xl text-primary",
					children: "Cash flow forecast"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground",
					children: "Expected money in vs supplier payouts — normalized to EUR."
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Label, { children: "Horizon" }), /* @__PURE__ */ jsxs(Select, {
						value: horizon,
						onValueChange: setHorizon,
						children: [/* @__PURE__ */ jsx(SelectTrigger, {
							className: "w-32",
							children: /* @__PURE__ */ jsx(SelectValue, {})
						}), /* @__PURE__ */ jsxs(SelectContent, { children: [
							/* @__PURE__ */ jsx(SelectItem, {
								value: "30",
								children: "30 days"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "60",
								children: "60 days"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "90",
								children: "90 days"
							}),
							/* @__PURE__ */ jsx(SelectItem, {
								value: "365",
								children: "1 year"
							})
						] })]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ jsx(Kpi, {
						label: "Expected inflows",
						value: buckets.totalIn,
						icon: TrendingUp,
						tone: "positive"
					}),
					/* @__PURE__ */ jsx(Kpi, {
						label: "Expected outflows",
						value: buckets.totalOut,
						icon: TrendingDown,
						tone: "negative"
					}),
					/* @__PURE__ */ jsx(Kpi, {
						label: "Net",
						value: buckets.net,
						icon: Wallet,
						tone: buckets.net >= 0 ? "positive" : "negative"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
					className: "text-lg",
					children: "Money in"
				}) }), /* @__PURE__ */ jsxs(CardContent, {
					className: "space-y-4",
					children: [/* @__PURE__ */ jsx(Bucket, {
						title: "Overdue",
						items: buckets.overdueIn,
						tone: "danger"
					}), /* @__PURE__ */ jsx(Bucket, {
						title: "Upcoming",
						items: buckets.upcomingIn
					})]
				})] }), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
					className: "text-lg",
					children: "Money out"
				}) }), /* @__PURE__ */ jsxs(CardContent, {
					className: "space-y-4",
					children: [/* @__PURE__ */ jsx(Bucket, {
						title: "Overdue",
						items: buckets.overdueOut,
						tone: "danger",
						isOut: true
					}), /* @__PURE__ */ jsx(Bucket, {
						title: "Upcoming",
						items: buckets.upcomingOut,
						isOut: true
					})]
				})] })]
			}),
			/* @__PURE__ */ jsx(AddPayable, {
				suppliers,
				onAdded: () => qc.invalidateQueries({ queryKey: ["cf-payables"] })
			}),
			/* @__PURE__ */ jsx(PayablesList, {
				payables,
				onChanged: () => qc.invalidateQueries({ queryKey: ["cf-payables"] })
			})
		]
	});
}
function Kpi({ label, value, icon: Icon, tone }) {
	return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "flex items-center gap-3 p-5",
		children: [/* @__PURE__ */ jsx("div", {
			className: `rounded-lg p-2 ${tone === "positive" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`,
			children: /* @__PURE__ */ jsx(Icon, { className: "size-5" })
		}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
			className: "text-xs uppercase tracking-wide text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsxs("div", {
			className: "text-2xl font-semibold",
			children: ["€", value.toFixed(2)]
		})] })]
	}) });
}
function Bucket({ title, items, tone, isOut }) {
	const total = items.reduce((s, x) => s + Number(x.eur), 0);
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
		className: "mb-2 flex items-center justify-between",
		children: [/* @__PURE__ */ jsx("div", {
			className: "text-sm font-medium",
			children: title
		}), /* @__PURE__ */ jsxs("div", {
			className: `text-sm font-semibold ${tone === "danger" ? "text-destructive" : ""}`,
			children: ["€", total.toFixed(2)]
		})]
	}), items.length === 0 ? /* @__PURE__ */ jsx("div", {
		className: "rounded border border-dashed p-3 text-center text-xs text-muted-foreground",
		children: "Nothing here."
	}) : /* @__PURE__ */ jsxs("div", {
		className: "space-y-1.5",
		children: [items.slice(0, 10).map((x) => /* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between rounded border bg-card/60 px-3 py-2 text-sm",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", { children: x.label || x.description || x.agent_name || (isOut ? "Payout" : "Payment") }), /* @__PURE__ */ jsxs("div", {
				className: "text-xs text-muted-foreground",
				children: [
					"Due ",
					x.due_date,
					x.currency && x.currency !== "EUR" ? ` · ${x.currency} ${Number(x.amount).toFixed(2)}` : "",
					x.kind === "commission" && /* @__PURE__ */ jsx(Badge, {
						variant: "secondary",
						className: "ml-2",
						children: "Commission"
					})
				]
			})] }), /* @__PURE__ */ jsxs("div", {
				className: "font-medium",
				children: ["€", Number(x.eur).toFixed(2)]
			})]
		}, x.id)), items.length > 10 && /* @__PURE__ */ jsxs("div", {
			className: "text-center text-xs text-muted-foreground",
			children: [
				"+ ",
				items.length - 10,
				" more…"
			]
		})]
	})] });
}
function AddPayable({ suppliers, onAdded }) {
	const [desc, setDesc] = useState("");
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("EUR");
	const [due, setDue] = useState("");
	const [supplierId, setSupplierId] = useState("__none__");
	async function submit(e) {
		e.preventDefault();
		if (!desc || !amount || !due) return;
		const { data: u } = await supabase.auth.getUser();
		const { error } = await supabase.from("supplier_payables").insert({
			user_id: u.user.id,
			description: desc,
			amount: Number(amount),
			currency,
			due_date: due,
			supplier_id: supplierId === "__none__" ? null : supplierId
		});
		if (error) return toast.error(error.message);
		setDesc("");
		setAmount("");
		setDue("");
		setSupplierId("__none__");
		toast.success("Payable added");
		onAdded();
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
		className: "text-lg",
		children: "Add supplier payable"
	}) }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "grid gap-2 sm:grid-cols-6",
		children: [
			/* @__PURE__ */ jsx(Input, {
				className: "sm:col-span-2",
				placeholder: "Description (e.g. Igloo booking)",
				value: desc,
				onChange: (e) => setDesc(e.target.value)
			}),
			/* @__PURE__ */ jsxs(Select, {
				value: supplierId,
				onValueChange: setSupplierId,
				children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Supplier" }) }), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
					value: "__none__",
					children: "No supplier"
				}), suppliers.map((s) => /* @__PURE__ */ jsx(SelectItem, {
					value: s.id,
					children: s.name
				}, s.id))] })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-1",
				children: [/* @__PURE__ */ jsx(Input, {
					type: "number",
					step: "0.01",
					placeholder: "Amount",
					value: amount,
					onChange: (e) => setAmount(e.target.value)
				}), /* @__PURE__ */ jsxs(Select, {
					value: currency,
					onValueChange: setCurrency,
					children: [/* @__PURE__ */ jsx(SelectTrigger, {
						className: "w-20",
						children: /* @__PURE__ */ jsx(SelectValue, {})
					}), /* @__PURE__ */ jsx(SelectContent, { children: [
						"EUR",
						"USD",
						"GBP",
						"INR"
					].map((c) => /* @__PURE__ */ jsx(SelectItem, {
						value: c,
						children: c
					}, c)) })]
				})]
			}),
			/* @__PURE__ */ jsx(Input, {
				type: "date",
				value: due,
				onChange: (e) => setDue(e.target.value)
			}),
			/* @__PURE__ */ jsxs(Button, {
				type: "submit",
				children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
			})
		]
	}) })] });
}
function PayablesList({ payables, onChanged }) {
	async function togglePaid(row) {
		const paid = !row.paid;
		const { error } = await supabase.from("supplier_payables").update({
			paid,
			paid_at: paid ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", row.id);
		if (error) return toast.error(error.message);
		onChanged();
	}
	async function del(id) {
		if (!confirm("Delete payable?")) return;
		const { error } = await supabase.from("supplier_payables").delete().eq("id", id);
		if (error) return toast.error(error.message);
		onChanged();
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, {
		className: "text-lg",
		children: "All supplier payables"
	}) }), /* @__PURE__ */ jsx(CardContent, { children: payables.length === 0 ? /* @__PURE__ */ jsx("div", {
		className: "py-6 text-center text-sm text-muted-foreground",
		children: "No payables tracked yet."
	}) : /* @__PURE__ */ jsx("div", {
		className: "space-y-2",
		children: payables.map((p) => /* @__PURE__ */ jsxs("div", {
			className: `flex items-center justify-between gap-3 rounded-lg border p-3 ${p.paid ? "bg-muted/40" : "bg-card/60"}`,
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx(Button, {
					variant: p.paid ? "default" : "outline",
					size: "icon",
					className: "size-8",
					onClick: () => togglePaid(p),
					children: /* @__PURE__ */ jsx(Check, { className: "size-4" })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					className: "text-sm font-medium",
					children: p.description
				}), /* @__PURE__ */ jsxs("div", {
					className: "text-xs text-muted-foreground",
					children: [
						p.supplier?.name ? `${p.supplier.name} · ` : "",
						"Due ",
						p.due_date
					]
				})] })]
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "font-semibold",
					children: [
						p.currency,
						" ",
						Number(p.amount).toFixed(2)
					]
				}), /* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					size: "icon",
					className: "size-7",
					onClick: () => del(p.id),
					children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5 text-destructive" })
				})]
			})]
		}, p.id))
	}) })] });
}
//#endregion
export { CashFlow as component };

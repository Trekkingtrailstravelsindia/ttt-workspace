import { t as supabase } from "./client-CROz1RyC.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { useMemo } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/routes/_authenticated/reports.tsx?tsr-split=component
function ReportsPage() {
	const { data } = useQuery({
		queryKey: ["reports"],
		queryFn: async () => {
			const [bookingsRes, expensesRes, invoicesRes, customersRes] = await Promise.all([
				supabase.from("bookings").select("id,start_date,total_amount,package_id,customer_id,package:tour_packages(name)"),
				supabase.from("booking_expenses").select("booking_id,amount"),
				supabase.from("invoices").select("issue_date,total,status"),
				supabase.from("customers").select("id,lead_source,lost_reason,stage")
			]);
			return {
				bookings: bookingsRes.data ?? [],
				expenses: expensesRes.data ?? [],
				invoices: invoicesRes.data ?? [],
				customers: customersRes.data ?? []
			};
		}
	});
	const monthly = useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (let i = 5; i >= 0; i--) {
			const d = /* @__PURE__ */ new Date();
			d.setMonth(d.getMonth() - i);
			d.setDate(1);
			const key = d.toISOString().slice(0, 7);
			map.set(key, {
				month: d.toLocaleString("en", { month: "short" }),
				revenue: 0,
				expenses: 0,
				profit: 0
			});
		}
		const expByBooking = /* @__PURE__ */ new Map();
		(data?.expenses ?? []).forEach((e) => expByBooking.set(e.booking_id, (expByBooking.get(e.booking_id) ?? 0) + Number(e.amount)));
		(data?.bookings ?? []).forEach((b) => {
			const key = (b.start_date ?? "").slice(0, 7);
			const row = map.get(key);
			if (!row) return;
			row.revenue += Number(b.total_amount);
			row.expenses += expByBooking.get(b.id) ?? 0;
			row.profit = row.revenue - row.expenses;
		});
		return Array.from(map.values());
	}, [data]);
	const topPackages = useMemo(() => {
		const m = /* @__PURE__ */ new Map();
		const expByBooking = /* @__PURE__ */ new Map();
		(data?.expenses ?? []).forEach((e) => expByBooking.set(e.booking_id, (expByBooking.get(e.booking_id) ?? 0) + Number(e.amount)));
		(data?.bookings ?? []).forEach((b) => {
			const name = b.package?.name ?? "Unknown";
			const row = m.get(name) ?? {
				name,
				sales: 0,
				profit: 0
			};
			row.sales += Number(b.total_amount);
			row.profit += Number(b.total_amount) - (expByBooking.get(b.id) ?? 0);
			m.set(name, row);
		});
		return Array.from(m.values()).sort((a, b) => b.sales - a.sales).slice(0, 6);
	}, [data]);
	const invoiceTotal = (data?.invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
	const paid = (data?.invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
	const heatmap = useMemo(() => {
		const MONTHS = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
		];
		const years = /* @__PURE__ */ new Set();
		const cell = /* @__PURE__ */ new Map();
		(data?.bookings ?? []).forEach((b) => {
			if (!b.start_date) return;
			const d = new Date(b.start_date);
			const y = d.getFullYear();
			const m = d.getMonth();
			years.add(y);
			const k = `${y}-${m}`;
			const row = cell.get(k) ?? {
				count: 0,
				revenue: 0
			};
			row.count += 1;
			row.revenue += Number(b.total_amount);
			cell.set(k, row);
		});
		return {
			months: MONTHS,
			years: Array.from(years).sort(),
			cell,
			max: Math.max(1, ...Array.from(cell.values()).map((v) => v.count))
		};
	}, [data]);
	const sourceROI = useMemo(() => {
		const custBy = /* @__PURE__ */ new Map();
		(data?.customers ?? []).forEach((c) => custBy.set(c.id, c));
		const revBySource = /* @__PURE__ */ new Map();
		(data?.bookings ?? []).forEach((b) => {
			const src = custBy.get(b.customer_id)?.lead_source ?? "Unknown";
			revBySource.set(src, (revBySource.get(src) ?? 0) + Number(b.total_amount));
		});
		const m = /* @__PURE__ */ new Map();
		(data?.customers ?? []).forEach((c) => {
			const src = c.lead_source ?? "Unknown";
			const row = m.get(src) ?? {
				source: src,
				leads: 0,
				converted: 0,
				revenue: 0
			};
			row.leads += 1;
			if (c.stage === "confirmed" || c.stage === "completed") row.converted += 1;
			m.set(src, row);
		});
		m.forEach((row, src) => {
			row.revenue = revBySource.get(src) ?? 0;
		});
		return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
	}, [data]);
	const lostReasons = useMemo(() => {
		const m = /* @__PURE__ */ new Map();
		(data?.customers ?? []).filter((c) => c.stage === "lost").forEach((c) => {
			const r = (c.lost_reason ?? "").trim() || "No reason given";
			m.set(r, (m.get(r) ?? 0) + 1);
		});
		return Array.from(m.entries()).map(([reason, count]) => ({
			reason,
			count
		})).sort((a, b) => b.count - a.count);
	}, [data]);
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Reports"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "Sales, expenses & profit over time."
			})] }),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Invoiced total",
						value: `€${invoiceTotal.toFixed(0)}`
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Collected (paid)",
						value: `€${paid.toFixed(0)}`
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Collection rate",
						value: invoiceTotal ? `${(paid / invoiceTotal * 100).toFixed(0)}%` : "—"
					})
				]
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Revenue vs expenses (last 6 months)" }) }), /* @__PURE__ */ jsx(CardContent, {
				className: "h-72",
				children: /* @__PURE__ */ jsx(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ jsxs(LineChart, {
						data: monthly,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								strokeDasharray: "3 3",
								className: "stroke-border"
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "month",
								className: "text-xs"
							}),
							/* @__PURE__ */ jsx(YAxis, { className: "text-xs" }),
							/* @__PURE__ */ jsx(Tooltip, {}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: "revenue",
								stroke: "hsl(var(--primary))",
								strokeWidth: 2
							}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: "expenses",
								stroke: "hsl(var(--destructive))",
								strokeWidth: 2
							}),
							/* @__PURE__ */ jsx(Line, {
								type: "monotone",
								dataKey: "profit",
								stroke: "hsl(var(--accent))",
								strokeWidth: 2
							})
						]
					})
				})
			})] }),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Top packages by sales" }) }), /* @__PURE__ */ jsx(CardContent, {
				className: "h-72",
				children: /* @__PURE__ */ jsx(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ jsxs(BarChart, {
						data: topPackages,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								strokeDasharray: "3 3",
								className: "stroke-border"
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "name",
								className: "text-xs"
							}),
							/* @__PURE__ */ jsx(YAxis, { className: "text-xs" }),
							/* @__PURE__ */ jsx(Tooltip, {}),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "sales",
								fill: "hsl(var(--primary))"
							}),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "profit",
								fill: "hsl(var(--accent))"
							})
						]
					})
				})
			})] }),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Season heatmap — bookings by month" }) }), /* @__PURE__ */ jsx(CardContent, {
				className: "overflow-x-auto",
				children: !heatmap.years.length ? /* @__PURE__ */ jsx("p", {
					className: "py-6 text-center text-sm text-muted-foreground",
					children: "No bookings yet."
				}) : /* @__PURE__ */ jsxs("table", {
					className: "min-w-full text-xs",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
						className: "p-2 text-left font-medium text-muted-foreground",
						children: "Year"
					}), heatmap.months.map((m) => /* @__PURE__ */ jsx("th", {
						className: "p-2 text-center font-medium text-muted-foreground",
						children: m
					}, m))] }) }), /* @__PURE__ */ jsx("tbody", { children: heatmap.years.map((y) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", {
						className: "p-2 font-semibold",
						children: y
					}), heatmap.months.map((_, mi) => {
						const v = heatmap.cell.get(`${y}-${mi}`);
						const intensity = v ? Math.max(.15, v.count / heatmap.max) : 0;
						return /* @__PURE__ */ jsx("td", {
							className: "p-1",
							children: /* @__PURE__ */ jsx("div", {
								className: "mx-auto flex h-10 w-full min-w-[36px] items-center justify-center rounded",
								style: { backgroundColor: v ? `hsl(var(--primary) / ${intensity})` : "hsl(var(--muted))" },
								title: v ? `${v.count} booking(s) · €${v.revenue.toFixed(0)}` : "—",
								children: /* @__PURE__ */ jsx("span", {
									className: v && intensity > .5 ? "font-semibold text-primary-foreground" : "text-foreground",
									children: v?.count ?? ""
								})
							})
						}, mi);
					})] }, y)) })]
				})
			})] }),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Lead source ROI" }) }), /* @__PURE__ */ jsx(CardContent, { children: !sourceROI.length ? /* @__PURE__ */ jsx("p", {
					className: "py-6 text-center text-sm text-muted-foreground",
					children: "No lead data yet. Tag customers with a lead source to see ROI."
				}) : /* @__PURE__ */ jsxs("table", {
					className: "w-full text-sm",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
						className: "border-b text-xs uppercase text-muted-foreground",
						children: [
							/* @__PURE__ */ jsx("th", {
								className: "py-2 text-left",
								children: "Source"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "py-2 text-right",
								children: "Leads"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "py-2 text-right",
								children: "Conv %"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "py-2 text-right",
								children: "Revenue"
							})
						]
					}) }), /* @__PURE__ */ jsx("tbody", { children: sourceROI.map((r) => /* @__PURE__ */ jsxs("tr", {
						className: "border-b last:border-0",
						children: [
							/* @__PURE__ */ jsx("td", {
								className: "py-2",
								children: r.source
							}),
							/* @__PURE__ */ jsx("td", {
								className: "py-2 text-right",
								children: r.leads
							}),
							/* @__PURE__ */ jsx("td", {
								className: "py-2 text-right",
								children: r.leads ? `${(r.converted / r.leads * 100).toFixed(0)}%` : "—"
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "py-2 text-right font-medium",
								children: ["€", r.revenue.toFixed(0)]
							})
						]
					}, r.source)) })]
				}) })] }), /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Lost-deal reasons" }) }), /* @__PURE__ */ jsx(CardContent, { children: !lostReasons.length ? /* @__PURE__ */ jsx("p", {
					className: "py-6 text-center text-sm text-muted-foreground",
					children: "No lost deals recorded. When you mark a lead as \"Lost\", you'll be asked for a reason."
				}) : /* @__PURE__ */ jsx("div", {
					className: "space-y-2",
					children: lostReasons.map((r) => {
						const total = lostReasons.reduce((s, x) => s + x.count, 0);
						const pct = r.count / total * 100;
						return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
							className: "mb-1 flex items-center justify-between text-sm",
							children: [/* @__PURE__ */ jsx("span", {
								className: "truncate pr-2",
								children: r.reason
							}), /* @__PURE__ */ jsx(Badge, {
								variant: "secondary",
								children: r.count
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "h-2 overflow-hidden rounded-full bg-muted",
							children: /* @__PURE__ */ jsx("div", {
								className: "h-full bg-destructive",
								style: { width: `${pct}%` }
							})
						})] }, r.reason);
					})
				}) })] })]
			})
		]
	});
}
function StatCard({ label, value }) {
	return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "p-5",
		children: [/* @__PURE__ */ jsx("div", {
			className: "text-2xl font-semibold",
			children: value
		}), /* @__PURE__ */ jsx("div", {
			className: "text-xs uppercase tracking-wide text-muted-foreground",
			children: label
		})]
	}) });
}
//#endregion
export { ReportsPage as component };

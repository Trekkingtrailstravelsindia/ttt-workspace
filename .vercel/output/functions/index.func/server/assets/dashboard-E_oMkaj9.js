import { t as supabase } from "./client-CROz1RyC.js";
import { t as useCurrentRole } from "./use-current-role-D3aft_Es.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Package, PiggyBank, Receipt, TrendingUp, Users, Wallet } from "lucide-react";
//#region src/routes/_authenticated/dashboard.tsx?tsr-split=component
function Dashboard() {
	const { canSeeFinancials } = useCurrentRole();
	const { data } = useQuery({
		queryKey: ["dashboard", canSeeFinancials],
		queryFn: async () => {
			const [customers, packages, bookings, invoices, allBookings, expenses] = await Promise.all([
				supabase.from("customers").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("tour_packages").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("bookings").select("*, customer:customers(name), package:tour_packages(name)").order("created_at", { ascending: false }).limit(5),
				canSeeFinancials ? supabase.from("invoices").select("total, status") : Promise.resolve({ data: [] }),
				canSeeFinancials ? supabase.from("bookings").select("total_amount") : Promise.resolve({ data: [] }),
				canSeeFinancials ? supabase.from("booking_expenses").select("amount") : Promise.resolve({ data: [] })
			]);
			const revenue = (invoices.data ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
			const outstanding = (invoices.data ?? []).filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0);
			const bookingSales = (allBookings.data ?? []).reduce((s, b) => s + Number(b.total_amount), 0);
			const totalExpenses = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
			const profit = bookingSales - totalExpenses;
			return {
				customers: customers.count ?? 0,
				packages: packages.count ?? 0,
				bookings: bookings.data ?? [],
				revenue,
				outstanding,
				bookingSales,
				totalExpenses,
				profit
			};
		}
	});
	const baseStats = [{
		label: "Customers",
		value: data?.customers ?? 0,
		icon: Users,
		to: "/customers"
	}, {
		label: "Packages",
		value: data?.packages ?? 0,
		icon: Package,
		to: "/packages"
	}];
	const financeStats = [
		{
			label: "Booking sales",
			value: `€${(data?.bookingSales ?? 0).toFixed(0)}`,
			icon: TrendingUp,
			to: "/bookings"
		},
		{
			label: "Total expenses",
			value: `€${(data?.totalExpenses ?? 0).toFixed(0)}`,
			icon: Wallet,
			to: "/bookings"
		},
		{
			label: (data?.profit ?? 0) >= 0 ? "Profit" : "Loss",
			value: `€${Math.abs(data?.profit ?? 0).toFixed(0)}`,
			icon: PiggyBank,
			to: "/bookings"
		},
		{
			label: "Revenue (paid)",
			value: `€${(data?.revenue ?? 0).toFixed(0)}`,
			icon: TrendingUp,
			to: "/invoices"
		},
		{
			label: "Outstanding",
			value: `€${(data?.outstanding ?? 0).toFixed(0)}`,
			icon: Receipt,
			to: "/invoices"
		}
	];
	const stats = canSeeFinancials ? [...baseStats, ...financeStats] : baseStats;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Dashboard"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "Your Finland tour business at a glance."
			})] }),
			/* @__PURE__ */ jsx("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4",
				children: stats.map((s) => /* @__PURE__ */ jsx(Link, {
					to: s.to,
					children: /* @__PURE__ */ jsx(Card, {
						className: "transition-shadow hover:shadow-soft",
						children: /* @__PURE__ */ jsxs(CardContent, {
							className: "flex items-center gap-4 p-5",
							children: [/* @__PURE__ */ jsx("div", {
								className: "grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground",
								children: /* @__PURE__ */ jsx(s.icon, { className: "size-5" })
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "text-2xl font-semibold",
								children: s.value
							}), /* @__PURE__ */ jsx("div", {
								className: "text-xs uppercase tracking-wide text-muted-foreground",
								children: s.label
							})] })]
						})
					})
				}, s.label))
			}),
			/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, {
				className: "flex flex-row items-center justify-between",
				children: [/* @__PURE__ */ jsxs(CardTitle, {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Calendar, { className: "size-5" }), " Recent bookings"]
				}), /* @__PURE__ */ jsx(Link, {
					to: "/bookings",
					className: "text-sm text-primary hover:underline",
					children: "View all"
				})]
			}), /* @__PURE__ */ jsx(CardContent, { children: !data?.bookings.length ? /* @__PURE__ */ jsx("div", {
				className: "py-8 text-center text-sm text-muted-foreground",
				children: "No bookings yet."
			}) : /* @__PURE__ */ jsx("div", {
				className: "divide-y",
				children: data.bookings.map((b) => /* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center justify-between gap-2 py-3",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "font-medium",
						children: b.customer?.name
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted-foreground",
						children: [
							b.package?.name,
							" · ",
							b.start_date
						]
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ jsx(StatusBadge, { status: b.status }), /* @__PURE__ */ jsxs("span", {
							className: "font-medium",
							children: ["€", Number(b.total_amount).toFixed(0)]
						})]
					})]
				}, b.id))
			}) })] })
		]
	});
}
function StatusBadge({ status }) {
	return /* @__PURE__ */ jsx(Badge, {
		className: {
			inquiry: "bg-muted text-muted-foreground",
			confirmed: "bg-accent text-accent-foreground",
			completed: "bg-success text-success-foreground",
			cancelled: "bg-destructive/10 text-destructive"
		}[status] ?? "",
		variant: "secondary",
		children: status
	});
}
//#endregion
export { Dashboard as component };

import { t as supabase } from "./client-CROz1RyC.js";
import { t as cn } from "./utils-C_uf36nf.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
//#region src/routes/_authenticated/calendar.tsx?tsr-split=component
function CalendarPage() {
	const [cursor, setCursor] = useState(() => {
		const d = /* @__PURE__ */ new Date();
		d.setDate(1);
		return d;
	});
	const { data } = useQuery({
		queryKey: ["calendar-bookings"],
		queryFn: async () => (await supabase.from("bookings").select("id,start_date,end_date,status,customer:customers(name),package:tour_packages(name)")).data ?? []
	});
	const cells = useMemo(() => {
		const year = cursor.getFullYear();
		const month = cursor.getMonth();
		const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
		const days = new Date(year, month + 1, 0).getDate();
		const arr = [];
		for (let i = 0; i < startOffset; i++) arr.push(null);
		for (let d = 1; d <= days; d++) arr.push(new Date(year, month, d));
		while (arr.length % 7) arr.push(null);
		return arr;
	}, [cursor]);
	function bookingsOn(date) {
		const iso = date.toISOString().slice(0, 10);
		return (data ?? []).filter((b) => {
			const s = b.start_date;
			const e = b.end_date ?? b.start_date;
			return iso >= s && iso <= e;
		});
	}
	const monthName = cursor.toLocaleString("en", {
		month: "long",
		year: "numeric"
	});
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-4xl text-primary",
				children: "Calendar"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: "All departures at a glance."
			})] }), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ jsx(Button, {
						size: "icon",
						variant: "outline",
						onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)),
						children: /* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" })
					}),
					/* @__PURE__ */ jsx("div", {
						className: "min-w-[160px] text-center font-semibold",
						children: monthName
					}),
					/* @__PURE__ */ jsx(Button, {
						size: "icon",
						variant: "outline",
						onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)),
						children: /* @__PURE__ */ jsx(ChevronRight, { className: "size-4" })
					})
				]
			})]
		}), /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
			className: "p-3",
			children: [/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground",
				children: [
					"Mon",
					"Tue",
					"Wed",
					"Thu",
					"Fri",
					"Sat",
					"Sun"
				].map((d) => /* @__PURE__ */ jsx("div", {
					className: "py-2",
					children: d
				}, d))
			}), /* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-7 gap-1",
				children: cells.map((d, i) => {
					if (!d) return /* @__PURE__ */ jsx("div", { className: "min-h-24 rounded-lg bg-muted/20" }, i);
					const iso = d.toISOString().slice(0, 10);
					const bs = bookingsOn(d);
					return /* @__PURE__ */ jsxs("div", {
						className: cn("min-h-24 rounded-lg border p-1.5 text-xs", iso === today && "border-primary bg-primary/5"),
						children: [/* @__PURE__ */ jsx("div", {
							className: "mb-1 font-medium",
							children: d.getDate()
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [bs.slice(0, 3).map((b) => /* @__PURE__ */ jsx(Link, {
								to: "/bookings/$id",
								params: { id: b.id },
								className: "block truncate rounded bg-accent/60 px-1.5 py-0.5 text-accent-foreground hover:bg-accent",
								children: b.customer?.name ?? "Booking"
							}, b.id)), bs.length > 3 && /* @__PURE__ */ jsxs("div", {
								className: "text-[10px] text-muted-foreground",
								children: [
									"+",
									bs.length - 3,
									" more"
								]
							})]
						})]
					}, i);
				})
			})]
		}) })]
	});
}
//#endregion
export { CalendarPage as component };

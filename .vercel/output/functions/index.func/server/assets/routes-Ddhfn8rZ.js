import { t as Button } from "./button-Bq5vK6RO.js";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Compass, Package, Receipt, Sparkles, Users } from "lucide-react";
//#region src/routes/index.tsx?tsr-split=component
function Landing() {
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen aurora-bg",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-6",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsx("div", {
					className: "grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground",
					children: /* @__PURE__ */ jsx(Compass, { className: "size-5" })
				}), /* @__PURE__ */ jsx("span", {
					className: "font-display text-2xl",
					children: "Aurora CRM"
				})]
			}), /* @__PURE__ */ jsx(Button, {
				asChild: true,
				variant: "outline",
				children: /* @__PURE__ */ jsx(Link, {
					to: "/auth",
					children: "Sign in"
				})
			})]
		}), /* @__PURE__ */ jsxs("main", {
			className: "mx-auto max-w-6xl px-6 pt-12 pb-24",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mx-auto max-w-3xl text-center",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur",
						children: [/* @__PURE__ */ jsx(Sparkles, { className: "size-3.5 text-primary" }), " Built for Finland tour operators"]
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-6 font-display text-5xl leading-[1.05] text-primary sm:text-7xl",
						children: "Run every booking under the northern lights."
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mx-auto mt-6 max-w-xl text-lg text-muted-foreground",
						children: "Manage customers, tour packages, bookings and downloadable invoices — all in one calm, real-time workspace."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-8 flex justify-center gap-3",
						children: /* @__PURE__ */ jsx(Button, {
							asChild: true,
							size: "lg",
							children: /* @__PURE__ */ jsx(Link, {
								to: "/auth",
								children: "Get started"
							})
						})
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					{
						icon: Users,
						title: "Customers",
						desc: "Full traveler contact history"
					},
					{
						icon: Package,
						title: "Tour packages",
						desc: "Price, seasons and itineraries"
					},
					{
						icon: Compass,
						title: "Bookings",
						desc: "Track status in real time"
					},
					{
						icon: Receipt,
						title: "Invoices",
						desc: "Generate and download PDFs"
					}
				].map((f) => /* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl border bg-card/70 p-5 shadow-soft backdrop-blur",
					children: [
						/* @__PURE__ */ jsx(f.icon, { className: "size-6 text-primary" }),
						/* @__PURE__ */ jsx("div", {
							className: "mt-4 font-semibold",
							children: f.title
						}),
						/* @__PURE__ */ jsx("div", {
							className: "text-sm text-muted-foreground",
							children: f.desc
						})
					]
				}, f.title))
			})]
		})]
	});
}
//#endregion
export { Landing as component };

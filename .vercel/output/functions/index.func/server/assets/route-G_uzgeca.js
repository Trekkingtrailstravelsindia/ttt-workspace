import { t as supabase } from "./client-CROz1RyC.js";
import { t as useCurrentRole } from "./use-current-role-D3aft_Es.js";
import { t as cn } from "./utils-C_uf36nf.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { BarChart3, Calendar, CalendarClock, CalendarDays, CheckSquare, Compass, Filter, LayoutDashboard, LogOut, Menu, Package, Receipt, Settings, Tags, Truck, UserCog, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import * as SheetPrimitive from "@radix-ui/react-dialog";
//#region src/components/ui/sheet.tsx
var Sheet = SheetPrimitive.Root;
var SheetTrigger = SheetPrimitive.Trigger;
var SheetPortal = SheetPrimitive.Portal;
var SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Overlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [/* @__PURE__ */ jsx(SheetOverlay, {}), /* @__PURE__ */ jsxs(SheetPrimitive.Content, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ jsxs(SheetPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
var SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
//#endregion
//#region src/routes/_authenticated/route.tsx?tsr-split=component
var nav = [
	{
		to: "/dashboard",
		label: "Dashboard",
		icon: LayoutDashboard,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/leads",
		label: "Leads pipeline",
		icon: Filter,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/customers",
		label: "Customers",
		icon: Users,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/packages",
		label: "Tour packages",
		icon: Package,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/bookings",
		label: "Bookings",
		icon: Calendar,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/calendar",
		label: "Calendar",
		icon: CalendarDays,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/tasks",
		label: "Tasks",
		icon: CheckSquare,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/suppliers",
		label: "Suppliers",
		icon: Truck,
		roles: ["admin", "ops"]
	},
	{
		to: "/rate-cards",
		label: "Rate cards",
		icon: Tags,
		roles: ["admin", "ops"]
	},
	{
		to: "/departures",
		label: "Departures",
		icon: CalendarClock,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	},
	{
		to: "/invoices",
		label: "Invoices",
		icon: Receipt,
		roles: ["admin", "ops"]
	},
	{
		to: "/cash-flow",
		label: "Cash flow",
		icon: Wallet,
		roles: ["admin", "ops"]
	},
	{
		to: "/reports",
		label: "Reports",
		icon: BarChart3,
		roles: ["admin", "ops"]
	},
	{
		to: "/team",
		label: "Team",
		icon: UserCog,
		roles: ["admin"]
	},
	{
		to: "/settings",
		label: "Settings",
		icon: Settings,
		roles: [
			"admin",
			"ops",
			"sales"
		]
	}
];
function Shell() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "SIGNED_OUT") navigate({ to: "/auth" });
		});
		return () => sub.subscription.unsubscribe();
	}, [navigate]);
	async function signOut() {
		await supabase.auth.signOut();
		toast.success("Signed out");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ jsx("aside", {
				className: "fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
				children: /* @__PURE__ */ jsx(SidebarInner, {
					email,
					onSignOut: signOut
				})
			}),
			/* @__PURE__ */ jsxs("header", {
				className: "sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden",
				children: [/* @__PURE__ */ jsxs(Link, {
					to: "/dashboard",
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx("div", {
						className: "grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground",
						children: /* @__PURE__ */ jsx(Compass, { className: "size-4" })
					}), /* @__PURE__ */ jsx("span", {
						className: "font-display text-lg",
						children: "Aurora CRM"
					})]
				}), /* @__PURE__ */ jsxs(Sheet, { children: [/* @__PURE__ */ jsx(SheetTrigger, {
					asChild: true,
					children: /* @__PURE__ */ jsx(Button, {
						variant: "ghost",
						size: "icon",
						children: /* @__PURE__ */ jsx(Menu, {})
					})
				}), /* @__PURE__ */ jsxs(SheetContent, {
					side: "left",
					className: "w-64 bg-sidebar p-0 text-sidebar-foreground",
					children: [/* @__PURE__ */ jsx(SheetHeader, {
						className: "sr-only",
						children: /* @__PURE__ */ jsx(SheetTitle, { children: "Navigation" })
					}), /* @__PURE__ */ jsx(SidebarInner, {
						email,
						onSignOut: signOut
					})]
				})] })]
			}),
			/* @__PURE__ */ jsx("main", {
				className: "md:pl-64",
				children: /* @__PURE__ */ jsx("div", {
					className: "mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10",
					children: /* @__PURE__ */ jsx(Outlet, {})
				})
			})
		]
	});
}
function SidebarInner({ email, onSignOut }) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const { roles, isLoading } = useCurrentRole();
	const visible = nav.filter((item) => isLoading || roles.length === 0 || item.roles.some((r) => roles.includes(r)));
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 px-5 py-6",
			children: [/* @__PURE__ */ jsx("div", {
				className: "grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground",
				children: /* @__PURE__ */ jsx(Compass, { className: "size-5" })
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
				className: "font-display text-xl leading-none",
				children: "Aurora CRM"
			}), /* @__PURE__ */ jsx("div", {
				className: "text-[11px] uppercase tracking-wider text-sidebar-foreground/60",
				children: "Finland tours"
			})] })]
		}),
		/* @__PURE__ */ jsx("nav", {
			className: "flex-1 space-y-1 px-3",
			children: visible.map((item) => {
				const active = path.startsWith(item.to);
				return /* @__PURE__ */ jsxs(Link, {
					to: item.to,
					className: cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"),
					children: [
						/* @__PURE__ */ jsx(item.icon, { className: "size-4" }),
						" ",
						item.label
					]
				}, item.to);
			})
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "border-t border-sidebar-border p-3",
			children: [/* @__PURE__ */ jsx("div", {
				className: "mb-2 truncate px-2 text-xs text-sidebar-foreground/60",
				children: email
			}), /* @__PURE__ */ jsxs(Button, {
				variant: "ghost",
				onClick: onSignOut,
				className: "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				children: [/* @__PURE__ */ jsx(LogOut, { className: "size-4" }), " Sign out"]
			})]
		})
	] });
}
//#endregion
export { Shell as component };

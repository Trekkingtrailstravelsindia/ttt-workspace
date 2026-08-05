import { t as supabase } from "./client-CROz1RyC.js";
import { n as Route$18 } from "./customers-CG4iiMSn.js";
import { t as Route$19 } from "./bookings._id-B0Y3dtMI.js";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, redirect, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//#region src/styles.css?url
var styles_default = "/assets/styles-B6rrGiw-.css";
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ jsx("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$17 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Trekking Trails Travels — Workspace" },
			{
				name: "description",
				content: "Tour operator workspace for managing bookings, customers, packages and invoices."
			},
			{
				property: "og:title",
				content: "Trekking Trails Travels — Workspace"
			},
			{
				property: "og:description",
				content: "Tour operator workspace for managing bookings, customers, packages and invoices."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "Trekking Trails Travels — Workspace"
			},
			{
				name: "twitter:description",
				content: "Tour operator workspace for managing bookings, customers, packages and invoices."
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$17.useRouteContext();
	return /* @__PURE__ */ jsx(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ jsx(Outlet, {})
	});
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$16 = () => import("./routes-Ddhfn8rZ.js");
var Route$16 = createFileRoute("/")({
	beforeLoad: async () => {
		if (typeof window === "undefined") return;
		const { data } = await supabase.auth.getSession();
		if (data.session) throw redirect({ to: "/dashboard" });
	},
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
//#endregion
//#region src/routes/_authenticated/route.tsx
var $$splitComponentImporter$15 = () => import("./route-G_uzgeca.js");
var Route$15 = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async () => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/auth" });
		return { user: data.user };
	},
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
//#endregion
//#region src/routes/auth.tsx
var $$splitComponentImporter$14 = () => import("./auth-DOk-ZCou.js");
var Route$14 = createFileRoute("/auth")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
//#endregion
//#region src/routes/_authenticated/bookings.tsx
var $$splitComponentImporter$13 = () => import("./bookings-BV69ewFs.js");
var Route$13 = createFileRoute("/_authenticated/bookings")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
//#endregion
//#region src/routes/_authenticated/calendar.tsx
var $$splitComponentImporter$12 = () => import("./calendar-D_T6KZm3.js");
var Route$12 = createFileRoute("/_authenticated/calendar")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
//#endregion
//#region src/routes/_authenticated/cash-flow.tsx
var $$splitComponentImporter$11 = () => import("./cash-flow-C4ttpfyG.js");
var Route$11 = createFileRoute("/_authenticated/cash-flow")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
//#endregion
//#region src/routes/_authenticated/dashboard.tsx
var $$splitComponentImporter$10 = () => import("./dashboard-E_oMkaj9.js");
var Route$10 = createFileRoute("/_authenticated/dashboard")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
//#endregion
//#region src/routes/_authenticated/departures.tsx
var $$splitComponentImporter$9 = () => import("./departures-C1mK-v6z.js");
var Route$9 = createFileRoute("/_authenticated/departures")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
//#endregion
//#region src/routes/_authenticated/invoices.tsx
var $$splitComponentImporter$8 = () => import("./invoices-Arjebt69.js");
var Route$8 = createFileRoute("/_authenticated/invoices")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
//#endregion
//#region src/routes/_authenticated/leads.tsx
var $$splitComponentImporter$7 = () => import("./leads-BNsMXn_H.js");
var Route$7 = createFileRoute("/_authenticated/leads")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
//#endregion
//#region src/routes/_authenticated/packages.tsx
var $$splitComponentImporter$6 = () => import("./packages-DmmfyCEN.js");
var Route$6 = createFileRoute("/_authenticated/packages")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
//#endregion
//#region src/routes/_authenticated/rate-cards.tsx
var $$splitComponentImporter$5 = () => import("./rate-cards-CtQsZI8K.js");
var Route$5 = createFileRoute("/_authenticated/rate-cards")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region src/routes/_authenticated/reports.tsx
var $$splitComponentImporter$4 = () => import("./reports-SL1PgrmK.js");
var Route$4 = createFileRoute("/_authenticated/reports")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region src/routes/_authenticated/settings.tsx
var $$splitComponentImporter$3 = () => import("./settings-DE065tX1.js");
var Route$3 = createFileRoute("/_authenticated/settings")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
//#endregion
//#region src/routes/_authenticated/suppliers.tsx
var $$splitComponentImporter$2 = () => import("./suppliers-C7epIfBJ.js");
var Route$2 = createFileRoute("/_authenticated/suppliers")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
//#endregion
//#region src/routes/_authenticated/tasks.tsx
var $$splitComponentImporter$1 = () => import("./tasks-BrEgHAEH.js");
var Route$1 = createFileRoute("/_authenticated/tasks")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
//#endregion
//#region src/routes/_authenticated/team.tsx
var $$splitNotFoundComponentImporter = () => import("./team-BcvyWKin.js");
var $$splitErrorComponentImporter = () => import("./team-Ddm7Is20.js");
var $$splitComponentImporter = () => import("./team-V3PwxVLP.js");
var Route = createFileRoute("/_authenticated/team")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
//#endregion
//#region src/routeTree.gen.ts
var IndexRoute = Route$16.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$17
});
var AuthenticatedRouteRoute = Route$15.update({
	id: "/_authenticated",
	getParentRoute: () => Route$17
});
var AuthRoute = Route$14.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$17
});
var AuthenticatedBookingsRoute = Route$13.update({
	id: "/bookings",
	path: "/bookings",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCalendarRoute = Route$12.update({
	id: "/calendar",
	path: "/calendar",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCashFlowRoute = Route$11.update({
	id: "/cash-flow",
	path: "/cash-flow",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCustomersRoute = Route$18.update({
	id: "/customers",
	path: "/customers",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDashboardRoute = Route$10.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDeparturesRoute = Route$9.update({
	id: "/departures",
	path: "/departures",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedInvoicesRoute = Route$8.update({
	id: "/invoices",
	path: "/invoices",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedLeadsRoute = Route$7.update({
	id: "/leads",
	path: "/leads",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPackagesRoute = Route$6.update({
	id: "/packages",
	path: "/packages",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedRateCardsRoute = Route$5.update({
	id: "/rate-cards",
	path: "/rate-cards",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedReportsRoute = Route$4.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSettingsRoute = Route$3.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSuppliersRoute = Route$2.update({
	id: "/suppliers",
	path: "/suppliers",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTasksRoute = Route$1.update({
	id: "/tasks",
	path: "/tasks",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTeamRoute = Route.update({
	id: "/team",
	path: "/team",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedBookingsRouteChildren = { AuthenticatedBookingsIdRoute: Route$19.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AuthenticatedBookingsRoute
}) };
var AuthenticatedRouteRouteChildren = {
	AuthenticatedBookingsRoute: AuthenticatedBookingsRoute._addFileChildren(AuthenticatedBookingsRouteChildren),
	AuthenticatedCalendarRoute,
	AuthenticatedCashFlowRoute,
	AuthenticatedCustomersRoute,
	AuthenticatedDashboardRoute,
	AuthenticatedDeparturesRoute,
	AuthenticatedInvoicesRoute,
	AuthenticatedLeadsRoute,
	AuthenticatedPackagesRoute,
	AuthenticatedRateCardsRoute,
	AuthenticatedReportsRoute,
	AuthenticatedSettingsRoute,
	AuthenticatedSuppliersRoute,
	AuthenticatedTasksRoute,
	AuthenticatedTeamRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };

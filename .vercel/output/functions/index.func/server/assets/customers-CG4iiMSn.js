import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
//#region src/routes/_authenticated/customers.tsx
var $$splitComponentImporter = () => import("./customers-BIF8SiT-.js");
var LEAD_SOURCES = [
	"Website",
	"Instagram",
	"Facebook",
	"Google Ads",
	"Referral",
	"Travel Agent",
	"Repeat Customer",
	"Other"
];
var Route = createFileRoute("/_authenticated/customers")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
//#endregion
export { Route as n, LEAD_SOURCES as t };

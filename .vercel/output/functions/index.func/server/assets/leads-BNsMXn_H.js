import { t as supabase } from "./client-CROz1RyC.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/_authenticated/leads.tsx?tsr-split=component
var STAGES = [
	{
		key: "new_lead",
		label: "New leads",
		color: "bg-muted text-muted-foreground"
	},
	{
		key: "contacted",
		label: "Contacted",
		color: "bg-accent/60 text-accent-foreground"
	},
	{
		key: "quoted",
		label: "Quoted",
		color: "bg-accent text-accent-foreground"
	},
	{
		key: "confirmed",
		label: "Confirmed",
		color: "bg-success/80 text-success-foreground"
	},
	{
		key: "completed",
		label: "Completed",
		color: "bg-success text-success-foreground"
	},
	{
		key: "lost",
		label: "Lost",
		color: "bg-destructive/10 text-destructive"
	}
];
function LeadsPage() {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["leads"],
		queryFn: async () => (await supabase.from("customers").select("id,name,email,phone,country,stage,lead_source,lost_reason").order("created_at", { ascending: false })).data ?? []
	});
	async function move(id, stage) {
		const patch = { stage };
		if (stage === "lost") {
			const reason = prompt("Reason for losing this deal? (helps future analysis)");
			if (reason === null) return;
			patch.lost_reason = reason || null;
		}
		const { error } = await supabase.from("customers").update(patch).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Moved");
		qc.invalidateQueries({ queryKey: ["leads"] });
		qc.invalidateQueries({ queryKey: ["customers"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
			className: "font-display text-4xl text-primary",
			children: "Leads pipeline"
		}), /* @__PURE__ */ jsx("p", {
			className: "text-muted-foreground",
			children: "Move inquiries through the sales stages."
		})] }), /* @__PURE__ */ jsx("div", {
			className: "grid gap-4 lg:grid-cols-3 xl:grid-cols-6",
			children: STAGES.map((s) => {
				const items = (data ?? []).filter((c) => c.stage === s.key);
				return /* @__PURE__ */ jsxs("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold text-sm",
							children: s.label
						}), /* @__PURE__ */ jsx(Badge, {
							variant: "secondary",
							className: s.color,
							children: items.length
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [items.map((c) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
							className: "space-y-2 p-3",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "font-medium",
									children: c.name
								}),
								c.country && /* @__PURE__ */ jsx("div", {
									className: "text-xs text-muted-foreground",
									children: c.country
								}),
								c.email && /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-1 text-xs text-muted-foreground",
									children: [
										/* @__PURE__ */ jsx(Mail, { className: "size-3" }),
										" ",
										c.email
									]
								}),
								c.phone && /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-1 text-xs text-muted-foreground",
									children: [
										/* @__PURE__ */ jsx(Phone, { className: "size-3" }),
										" ",
										c.phone
									]
								}),
								c.lead_source && /* @__PURE__ */ jsx(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: c.lead_source
								}),
								c.stage === "lost" && c.lost_reason && /* @__PURE__ */ jsxs("div", {
									className: "text-[11px] italic text-destructive",
									children: [
										"\"",
										c.lost_reason,
										"\""
									]
								}),
								/* @__PURE__ */ jsxs(Select, {
									value: c.stage,
									onValueChange: (v) => move(c.id, v),
									children: [/* @__PURE__ */ jsx(SelectTrigger, {
										className: "h-8 text-xs",
										children: /* @__PURE__ */ jsx(SelectValue, {})
									}), /* @__PURE__ */ jsx(SelectContent, { children: STAGES.map((x) => /* @__PURE__ */ jsx(SelectItem, {
										value: x.key,
										children: x.label
									}, x.key)) })]
								})
							]
						}) }, c.id)), !items.length && /* @__PURE__ */ jsx("div", {
							className: "rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground",
							children: "Empty"
						})]
					})]
				}, s.key);
			})
		})]
	});
}
//#endregion
export { LeadsPage as component };

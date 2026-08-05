import { t as supabase } from "./client-CROz1RyC.js";
import { t as Route } from "./bookings._id-B0Y3dtMI.js";
import { t as useCurrentRole } from "./use-current-role-D3aft_Es.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, CheckSquare2, Download, FileDown, FileText, Handshake, History, MapPin, MessageSquare, Plus, Send, Trash2, TrendingDown, TrendingUp, Upload, UserCheck } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
//#region src/lib/itinerary-pdf.ts
function downloadItineraryPdf(data, company = "Aurora Finland Tours") {
	const doc = new jsPDF();
	doc.setFontSize(22);
	doc.setTextColor(20, 30, 70);
	doc.text(company, 14, 20);
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 110);
	doc.text("Your Finland journey", 14, 26);
	doc.setFontSize(24);
	doc.setTextColor(20, 30, 70);
	doc.text("ITINERARY", 196, 22, { align: "right" });
	doc.setFontSize(14);
	doc.setTextColor(20, 30, 70);
	doc.text(data.package?.name ?? "Custom tour", 14, 42);
	doc.setFontSize(10);
	doc.setTextColor(80, 80, 100);
	const guest = data.customer?.name ?? "Guest";
	const dates = `${data.start_date}${data.end_date ? ` → ${data.end_date}` : ""}`;
	doc.text(`Guest: ${guest}    |    Travelers: ${data.travelers}    |    ${dates}`, 14, 48);
	autoTable(doc, {
		startY: 58,
		head: [[
			"Day",
			"Highlight",
			"Details"
		]],
		body: data.days.sort((a, b) => a.day_number - b.day_number).map((d) => [
			`Day ${d.day_number}`,
			d.title + (d.location ? `\n${d.location}` : ""),
			[d.description, d.activities].filter(Boolean).join("\n\n")
		]),
		styles: {
			fontSize: 9,
			cellPadding: 3,
			valign: "top"
		},
		headStyles: {
			fillColor: [
				20,
				30,
				70
			],
			textColor: 255
		},
		columnStyles: {
			0: {
				cellWidth: 20,
				fontStyle: "bold"
			},
			1: { cellWidth: 55 },
			2: { cellWidth: "auto" }
		}
	});
	doc.setFontSize(9);
	doc.setTextColor(120, 120, 140);
	doc.text(`Prepared by ${company}`, 14, 285);
	doc.save(`Itinerary_${(data.customer?.name ?? "guest").replace(/\s+/g, "_")}.pdf`);
}
//#endregion
//#region src/routes/_authenticated/bookings.$id.tsx?tsr-split=component
var CATEGORIES = [
	{
		value: "booking",
		label: "Booking"
	},
	{
		value: "transport",
		label: "Transport"
	},
	{
		value: "stay",
		label: "Stay"
	},
	{
		value: "activities",
		label: "Activities"
	},
	{
		value: "igloo",
		label: "Igloo"
	},
	{
		value: "train",
		label: "Train"
	},
	{
		value: "other",
		label: "Other"
	}
];
function BookingDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { canSeeFinancials, userId } = useCurrentRole();
	const { data: booking, isLoading } = useQuery({
		queryKey: ["booking", id],
		queryFn: async () => (await supabase.from("bookings").select("*, customer:customers(name,email,phone), package:tour_packages(name, price_per_person, duration_days)").eq("id", id).maybeSingle()).data
	});
	const { data: expenses } = useQuery({
		queryKey: ["booking-expenses", id],
		queryFn: async () => (await supabase.from("booking_expenses").select("*").eq("booking_id", id).order("expense_date", { ascending: false })).data ?? [],
		enabled: canSeeFinancials
	});
	const { data: docs } = useQuery({
		queryKey: ["booking-docs", id],
		queryFn: async () => (await supabase.from("booking_documents").select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? []
	});
	const { data: staff = [] } = useQuery({
		queryKey: ["staff-profiles"],
		queryFn: async () => (await supabase.from("profiles").select("id, email, full_name").order("email")).data ?? []
	});
	const { data: notes = [] } = useQuery({
		queryKey: ["booking-notes", id],
		queryFn: async () => (await supabase.from("booking_notes").select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? []
	});
	const { data: activity = [] } = useQuery({
		queryKey: ["booking-activity", id],
		queryFn: async () => (await supabase.from("booking_activity").select("*").eq("booking_id", id).order("created_at", { ascending: false }).limit(50)).data ?? []
	});
	const { data: itinerary = [] } = useQuery({
		queryKey: ["booking-itinerary", id],
		queryFn: async () => (await supabase.from("booking_itinerary").select("*").eq("booking_id", id).order("day_number")).data ?? []
	});
	const { data: checklist = [] } = useQuery({
		queryKey: ["booking-checklist", id],
		queryFn: async () => (await supabase.from("booking_checklist").select("*").eq("booking_id", id).order("created_at")).data ?? []
	});
	const { data: installments = [] } = useQuery({
		queryKey: ["booking-installments", id],
		queryFn: async () => (await supabase.from("booking_installments").select("*").eq("booking_id", id).order("due_date")).data ?? [],
		enabled: canSeeFinancials
	});
	const { data: commissions = [] } = useQuery({
		queryKey: ["booking-commissions", id],
		queryFn: async () => (await supabase.from("commissions").select("*").eq("booking_id", id).order("created_at", { ascending: false })).data ?? [],
		enabled: canSeeFinancials
	});
	useEffect(() => {
		const ch = supabase.channel(`booking-exp-${id}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "booking_expenses",
			filter: `booking_id=eq.${id}`
		}, () => qc.invalidateQueries({ queryKey: ["booking-expenses", id] })).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "booking_notes",
			filter: `booking_id=eq.${id}`
		}, () => qc.invalidateQueries({ queryKey: ["booking-notes", id] })).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "booking_activity",
			filter: `booking_id=eq.${id}`
		}, () => qc.invalidateQueries({ queryKey: ["booking-activity", id] })).subscribe();
		return () => {
			supabase.removeChannel(ch);
		};
	}, [id, qc]);
	const totals = useMemo(() => {
		const sell = Number(booking?.total_amount ?? 0);
		const totalExp = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
		const byCat = {};
		(expenses ?? []).forEach((e) => {
			byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);
		});
		const profit = sell - totalExp;
		return {
			sell,
			totalExp,
			byCat,
			profit,
			margin: sell > 0 ? profit / sell * 100 : 0
		};
	}, [booking, expenses]);
	async function assignTo(newId) {
		const { error } = await supabase.from("bookings").update({ assigned_to: newId }).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success(newId ? "Assigned" : "Unassigned");
		qc.invalidateQueries({ queryKey: ["booking", id] });
	}
	async function updateCurrency(currency) {
		const { error } = await supabase.from("bookings").update({ currency }).eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking", id] });
	}
	async function updateFx(fx) {
		const { error } = await supabase.from("bookings").update({ fx_rate: fx }).eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking", id] });
	}
	const cur = booking?.currency || "EUR";
	const symbol = (c) => ({
		EUR: "€",
		USD: "$",
		INR: "₹",
		GBP: "£"
	})[c] || c + " ";
	const sym = symbol(cur);
	if (isLoading) return /* @__PURE__ */ jsx("div", {
		className: "py-12 text-center text-muted-foreground",
		children: "Loading…"
	});
	if (!booking) return /* @__PURE__ */ jsx("div", {
		className: "py-12 text-center text-muted-foreground",
		children: "Booking not found."
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "flex items-center gap-2",
				children: /* @__PURE__ */ jsxs(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => navigate({ to: "/bookings" }),
					children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "size-4" }), " Back"]
				})
			}),
			/* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
				className: "flex flex-wrap items-start justify-between gap-4 p-6",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("div", {
						className: "text-xs uppercase tracking-wide text-muted-foreground",
						children: "Booking"
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "font-display text-3xl text-primary",
						children: booking.customer?.name
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-1 text-sm text-muted-foreground",
						children: [
							booking.package?.name,
							" · ",
							booking.start_date,
							booking.end_date ? ` → ${booking.end_date}` : "",
							" · ",
							booking.travelers,
							" traveler(s)"
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ jsx(Badge, {
							variant: "secondary",
							children: booking.status
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-xs",
							children: [/* @__PURE__ */ jsx(UserCheck, { className: "size-3.5 text-muted-foreground" }), /* @__PURE__ */ jsxs(Select, {
								value: booking.assigned_to ?? "__unassigned__",
								onValueChange: (v) => assignTo(v === "__unassigned__" ? null : v),
								children: [/* @__PURE__ */ jsx(SelectTrigger, {
									className: "h-7 w-52 text-xs",
									children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Unassigned" })
								}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
									value: "__unassigned__",
									children: "Unassigned"
								}), staff.map((s) => /* @__PURE__ */ jsx(SelectItem, {
									value: s.id,
									children: s.full_name || s.email
								}, s.id))] })]
							})]
						})]
					})
				] }), canSeeFinancials && /* @__PURE__ */ jsxs("div", {
					className: "space-y-2 text-right",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "text-xs uppercase tracking-wide text-muted-foreground",
							children: "Package sell price"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "text-3xl font-semibold text-primary",
							children: [sym, totals.sell.toFixed(2)]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-end gap-2 text-xs",
							children: [/* @__PURE__ */ jsxs(Select, {
								value: cur,
								onValueChange: updateCurrency,
								children: [/* @__PURE__ */ jsx(SelectTrigger, {
									className: "h-7 w-20 text-xs",
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
							}), cur !== "EUR" && /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-muted-foreground",
									children: "FX→EUR"
								}), /* @__PURE__ */ jsx(Input, {
									type: "number",
									step: "0.0001",
									defaultValue: booking.fx_rate ?? 1,
									onBlur: (e) => updateFx(Number(e.target.value) || 1),
									className: "h-7 w-20 text-xs"
								})]
							})]
						})
					]
				})]
			}) }),
			canSeeFinancials && /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-4 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ jsx(StatCard, {
							label: "Total expenses",
							value: `${sym}${totals.totalExp.toFixed(2)}`,
							tone: "neutral"
						}),
						/* @__PURE__ */ jsx(StatCard, {
							label: totals.profit >= 0 ? "Profit" : "Loss",
							value: `${sym}${Math.abs(totals.profit).toFixed(2)}`,
							tone: totals.profit >= 0 ? "positive" : "negative",
							icon: totals.profit >= 0 ? TrendingUp : TrendingDown
						}),
						/* @__PURE__ */ jsx(StatCard, {
							label: "Margin",
							value: `${totals.margin.toFixed(1)}%`,
							tone: totals.profit >= 0 ? "positive" : "negative"
						})
					]
				}),
				/* @__PURE__ */ jsx(ExpensesCard, {
					bookingId: id,
					expenses: expenses ?? [],
					byCat: totals.byCat
				}),
				/* @__PURE__ */ jsx(InstallmentsCard, {
					bookingId: id,
					installments,
					currency: cur,
					sym
				}),
				/* @__PURE__ */ jsx(CommissionsCard, {
					bookingId: id,
					commissions,
					currency: cur,
					sym
				})
			] }),
			/* @__PURE__ */ jsx(ItineraryCard, {
				bookingId: id,
				itinerary,
				booking
			}),
			/* @__PURE__ */ jsx(ChecklistCard, {
				bookingId: id,
				items: checklist
			}),
			/* @__PURE__ */ jsx(WhatsAppCard, {
				booking,
				sym,
				totalSell: totals.sell
			}),
			/* @__PURE__ */ jsx(NotesCard, {
				bookingId: id,
				notes,
				staff,
				currentUserId: userId
			}),
			/* @__PURE__ */ jsx(DocumentsCard, {
				bookingId: id,
				docs: docs ?? []
			}),
			/* @__PURE__ */ jsx(ActivityCard, {
				activity,
				staff
			})
		]
	});
}
function NotesCard({ bookingId, notes, staff, currentUserId }) {
	const qc = useQueryClient();
	const [body, setBody] = useState("");
	const [saving, setSaving] = useState(false);
	const staffById = new Map(staff.map((s) => [s.id, s]));
	async function addNote(e) {
		e.preventDefault();
		if (!body.trim() || !currentUserId) return;
		setSaving(true);
		const mentions = staff.filter((s) => new RegExp(`@${(s.full_name || s.email.split("@")[0]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(body)).map((s) => s.id);
		const { error } = await supabase.from("booking_notes").insert({
			booking_id: bookingId,
			author_id: currentUserId,
			body: body.trim(),
			mentions
		});
		setSaving(false);
		if (error) return toast.error(error.message);
		setBody("");
		qc.invalidateQueries({ queryKey: ["booking-notes", bookingId] });
	}
	async function del(id) {
		if (!confirm("Delete note?")) return;
		const { error } = await supabase.from("booking_notes").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-notes", bookingId] });
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(MessageSquare, { className: "size-5" }), " Internal notes"]
	}) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-4",
		children: [/* @__PURE__ */ jsxs("form", {
			onSubmit: addNote,
			className: "space-y-2",
			children: [/* @__PURE__ */ jsx(Textarea, {
				value: body,
				onChange: (e) => setBody(e.target.value),
				rows: 2,
				placeholder: "Add note. Use @name to mention a teammate.",
				maxLength: 1e3
			}), /* @__PURE__ */ jsx("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					disabled: saving || !body.trim(),
					children: "Post note"
				})
			})]
		}), notes.length === 0 ? /* @__PURE__ */ jsx("div", {
			className: "py-6 text-center text-sm text-muted-foreground",
			children: "No notes yet."
		}) : /* @__PURE__ */ jsx("div", {
			className: "space-y-3",
			children: notes.map((n) => {
				const author = staffById.get(n.author_id);
				return /* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border bg-card/60 p-3",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted-foreground",
								children: [
									author?.full_name || author?.email || "Someone",
									" · ",
									new Date(n.created_at).toLocaleString()
								]
							}), n.author_id === currentUserId && /* @__PURE__ */ jsx(Button, {
								variant: "ghost",
								size: "icon",
								className: "size-6",
								onClick: () => del(n.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-3 text-destructive" })
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-1 whitespace-pre-wrap text-sm",
							children: n.body
						}),
						n.mentions?.length > 0 && /* @__PURE__ */ jsx("div", {
							className: "mt-1 flex flex-wrap gap-1",
							children: n.mentions.map((mid) => {
								const s = staffById.get(mid);
								return s ? /* @__PURE__ */ jsxs(Badge, {
									variant: "outline",
									className: "text-[10px]",
									children: ["@", s.full_name || s.email.split("@")[0]]
								}, mid) : null;
							})
						})
					]
				}, n.id);
			})
		})]
	})] });
}
function ActivityCard({ activity, staff }) {
	const staffById = new Map(staff.map((s) => [s.id, s]));
	if (activity.length === 0) return null;
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(History, { className: "size-5" }), " Activity log"]
	}) }), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", {
		className: "space-y-2 text-sm",
		children: activity.map((a) => {
			const actor = staffById.get(a.actor_id);
			return /* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3 border-l-2 border-primary/30 pl-3",
				children: [/* @__PURE__ */ jsx("div", {
					className: "text-xs text-muted-foreground w-40 shrink-0",
					children: new Date(a.created_at).toLocaleString()
				}), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "font-medium",
							children: actor?.full_name || actor?.email || "System"
						}),
						" ",
						/* @__PURE__ */ jsxs("span", {
							className: "text-muted-foreground",
							children: [
								a.action === "insert" ? "created" : a.action === "update" ? "updated" : "deleted",
								" ",
								a.entity.replace("booking_", "").replace("_", " ")
							]
						})
					]
				})]
			}, a.id);
		})
	}) })] });
}
function StatCard({ label, value, tone, icon: Icon }) {
	const toneCls = tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground";
	return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
		className: "p-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ jsx("div", {
				className: "text-xs uppercase tracking-wide text-muted-foreground",
				children: label
			}), Icon ? /* @__PURE__ */ jsx(Icon, { className: `size-4 ${toneCls}` }) : null]
		}), /* @__PURE__ */ jsx("div", {
			className: `mt-1 text-2xl font-semibold ${toneCls}`,
			children: value
		})]
	}) });
}
function ExpensesCard({ bookingId, expenses, byCat }) {
	const qc = useQueryClient();
	const [category, setCategory] = useState("transport");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [expenseDate, setExpenseDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	async function addExpense(e) {
		e.preventDefault();
		if (!description.trim() || !amount) return toast.error("Description and amount required");
		setSaving(true);
		const { data: u } = await supabase.auth.getUser();
		const { error } = await supabase.from("booking_expenses").insert({
			user_id: u.user.id,
			booking_id: bookingId,
			category,
			description: description.trim(),
			amount: Number(amount),
			expense_date: expenseDate,
			notes: notes.trim() || null
		});
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success("Expense added");
		setDescription("");
		setAmount("");
		setNotes("");
		qc.invalidateQueries({ queryKey: ["booking-expenses", bookingId] });
	}
	async function removeExpense(id) {
		if (!confirm("Delete expense?")) return;
		const { error } = await supabase.from("booking_expenses").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-expenses", bookingId] });
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Expenses" }) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("form", {
				onSubmit: addExpense,
				className: "grid gap-3 sm:grid-cols-6",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "sm:col-span-2",
						children: [/* @__PURE__ */ jsx(Label, { children: "Category" }), /* @__PURE__ */ jsxs(Select, {
							value: category,
							onValueChange: (v) => setCategory(v),
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: CATEGORIES.map((c) => /* @__PURE__ */ jsx(SelectItem, {
								value: c.value,
								children: c.label
							}, c.value)) })]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "sm:col-span-2",
						children: [/* @__PURE__ */ jsx(Label, { children: "Description" }), /* @__PURE__ */ jsx(Input, {
							value: description,
							onChange: (e) => setDescription(e.target.value),
							maxLength: 200,
							placeholder: "e.g. Rovaniemi train tickets"
						})]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Amount (€)" }), /* @__PURE__ */ jsx(Input, {
						type: "number",
						min: 0,
						step: "0.01",
						value: amount,
						onChange: (e) => setAmount(e.target.value)
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Date" }), /* @__PURE__ */ jsx(Input, {
						type: "date",
						value: expenseDate,
						onChange: (e) => setExpenseDate(e.target.value)
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "sm:col-span-5",
						children: [/* @__PURE__ */ jsx(Label, { children: "Notes" }), /* @__PURE__ */ jsx(Textarea, {
							value: notes,
							onChange: (e) => setNotes(e.target.value),
							rows: 2,
							maxLength: 500
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "flex items-end",
						children: /* @__PURE__ */ jsxs(Button, {
							type: "submit",
							disabled: saving,
							className: "w-full",
							children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
						})
					})
				]
			}),
			expenses.length > 0 && /* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7",
				children: CATEGORIES.map((c) => /* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border bg-card/60 p-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-[10px] uppercase tracking-wide text-muted-foreground",
						children: c.label
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-sm font-semibold",
						children: ["€", (byCat[c.value] ?? 0).toFixed(0)]
					})]
				}, c.value))
			}),
			expenses.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "py-8 text-center text-sm text-muted-foreground",
				children: "No expenses recorded yet."
			}) : /* @__PURE__ */ jsx("div", {
				className: "divide-y",
				children: expenses.map((e) => /* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center justify-between gap-3 py-3",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(Badge, {
									variant: "secondary",
									className: "capitalize",
									children: e.category
								}), /* @__PURE__ */ jsx("span", {
									className: "truncate font-medium",
									children: e.description
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted-foreground",
								children: [e.expense_date, e.notes ? ` · ${e.notes}` : ""]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "font-semibold",
							children: ["€", Number(e.amount).toFixed(2)]
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => removeExpense(e.id),
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
						})
					]
				}, e.id))
			})
		]
	})] });
}
function DocumentsCard({ bookingId, docs }) {
	const qc = useQueryClient();
	const [uploading, setUploading] = useState(false);
	async function onUpload(e) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (file.size > 20 * 1024 * 1024) return toast.error("Max file size 20MB");
		setUploading(true);
		const { data: u } = await supabase.auth.getUser();
		const uid = u.user.id;
		const safeName = file.name.replace(/[^\w.\-]+/g, "_");
		const path = `${uid}/${bookingId}/${Date.now()}_${safeName}`;
		const { error: upErr } = await supabase.storage.from("booking-documents").upload(path, file, { contentType: file.type });
		if (upErr) {
			setUploading(false);
			return toast.error(upErr.message);
		}
		const { error: insErr } = await supabase.from("booking_documents").insert({
			user_id: uid,
			booking_id: bookingId,
			file_path: path,
			file_name: file.name,
			mime_type: file.type || null,
			file_size: file.size
		});
		setUploading(false);
		if (insErr) return toast.error(insErr.message);
		toast.success("Document uploaded");
		qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
	}
	async function download(d) {
		const { data, error } = await supabase.storage.from("booking-documents").createSignedUrl(d.file_path, 60);
		if (error || !data) return toast.error(error?.message ?? "Failed");
		window.open(data.signedUrl, "_blank");
	}
	async function remove(d) {
		if (!confirm(`Delete "${d.file_name}"?`)) return;
		await supabase.storage.from("booking-documents").remove([d.file_path]);
		const { error } = await supabase.from("booking_documents").delete().eq("id", d.id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		qc.invalidateQueries({ queryKey: ["booking-docs", bookingId] });
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, {
		className: "flex flex-row items-center justify-between",
		children: [/* @__PURE__ */ jsx(CardTitle, { children: "Documents" }), /* @__PURE__ */ jsx(Button, {
			asChild: true,
			size: "sm",
			disabled: uploading,
			children: /* @__PURE__ */ jsxs("label", {
				className: "cursor-pointer",
				children: [
					/* @__PURE__ */ jsx(Upload, { className: "size-4" }),
					" ",
					uploading ? "Uploading…" : "Upload",
					/* @__PURE__ */ jsx("input", {
						type: "file",
						className: "hidden",
						onChange: onUpload
					})
				]
			})
		})]
	}), /* @__PURE__ */ jsx(CardContent, { children: docs.length === 0 ? /* @__PURE__ */ jsx("div", {
		className: "py-8 text-center text-sm text-muted-foreground",
		children: "No documents attached yet."
	}) : /* @__PURE__ */ jsx("div", {
		className: "divide-y",
		children: docs.map((d) => /* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-center justify-between gap-3 py-3",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex min-w-0 flex-1 items-center gap-3",
				children: [/* @__PURE__ */ jsx(FileText, { className: "size-5 shrink-0 text-primary" }), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ jsx("div", {
						className: "truncate font-medium",
						children: d.file_name
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground",
						children: [d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB · ` : "", new Date(d.created_at).toLocaleDateString()]
					})]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex gap-1",
				children: [/* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					size: "icon",
					onClick: () => download(d),
					children: /* @__PURE__ */ jsx(Download, { className: "size-4" })
				}), /* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					size: "icon",
					onClick: () => remove(d),
					children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
				})]
			})]
		}, d.id))
	}) })] });
}
function ItineraryCard({ bookingId, itinerary, booking }) {
	const qc = useQueryClient();
	const [dayNum, setDayNum] = useState("");
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [description, setDescription] = useState("");
	const [activities, setActivities] = useState("");
	const [saving, setSaving] = useState(false);
	const nextDay = (itinerary.reduce((m, i) => Math.max(m, i.day_number), 0) || 0) + 1;
	async function addDay(e) {
		e.preventDefault();
		if (!title.trim()) return toast.error("Title required");
		setSaving(true);
		const { error } = await supabase.from("booking_itinerary").insert({
			booking_id: bookingId,
			day_number: Number(dayNum) || nextDay,
			title: title.trim(),
			location: location.trim() || null,
			description: description.trim() || null,
			activities: activities.trim() || null
		});
		setSaving(false);
		if (error) return toast.error(error.message);
		setDayNum("");
		setTitle("");
		setLocation("");
		setDescription("");
		setActivities("");
		qc.invalidateQueries({ queryKey: ["booking-itinerary", bookingId] });
	}
	async function del(id) {
		if (!confirm("Delete this day?")) return;
		const { error } = await supabase.from("booking_itinerary").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-itinerary", bookingId] });
	}
	function exportPdf() {
		if (itinerary.length === 0) return toast.error("Add itinerary days first");
		downloadItineraryPdf({
			customer: booking.customer,
			package: booking.package,
			start_date: booking.start_date,
			end_date: booking.end_date,
			travelers: booking.travelers,
			days: itinerary
		});
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, {
		className: "flex flex-row items-center justify-between",
		children: [/* @__PURE__ */ jsxs(CardTitle, {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ jsx(MapPin, { className: "size-5" }), " Itinerary"]
		}), /* @__PURE__ */ jsxs(Button, {
			size: "sm",
			variant: "outline",
			onClick: exportPdf,
			children: [/* @__PURE__ */ jsx(FileDown, { className: "size-4" }), " Guest PDF"]
		})]
	}), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-4",
		children: [/* @__PURE__ */ jsxs("form", {
			onSubmit: addDay,
			className: "grid gap-2 sm:grid-cols-6",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Day #" }), /* @__PURE__ */ jsx(Input, {
					type: "number",
					min: 1,
					placeholder: String(nextDay),
					value: dayNum,
					onChange: (e) => setDayNum(e.target.value)
				})] }),
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-3",
					children: [/* @__PURE__ */ jsx(Label, { children: "Title" }), /* @__PURE__ */ jsx(Input, {
						value: title,
						onChange: (e) => setTitle(e.target.value),
						placeholder: "e.g. Arrival in Rovaniemi",
						maxLength: 120
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-2",
					children: [/* @__PURE__ */ jsx(Label, { children: "Location" }), /* @__PURE__ */ jsx(Input, {
						value: location,
						onChange: (e) => setLocation(e.target.value),
						placeholder: "City / hotel",
						maxLength: 120
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-3",
					children: [/* @__PURE__ */ jsx(Label, { children: "Description" }), /* @__PURE__ */ jsx(Textarea, {
						value: description,
						onChange: (e) => setDescription(e.target.value),
						rows: 2,
						maxLength: 500
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-3",
					children: [/* @__PURE__ */ jsx(Label, { children: "Activities" }), /* @__PURE__ */ jsx(Textarea, {
						value: activities,
						onChange: (e) => setActivities(e.target.value),
						rows: 2,
						maxLength: 500,
						placeholder: "Husky safari, Aurora hunt…"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "sm:col-span-6 flex justify-end",
					children: /* @__PURE__ */ jsxs(Button, {
						type: "submit",
						disabled: saving,
						children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add day"]
					})
				})
			]
		}), itinerary.length === 0 ? /* @__PURE__ */ jsx("div", {
			className: "py-6 text-center text-sm text-muted-foreground",
			children: "No days planned yet."
		}) : /* @__PURE__ */ jsx("div", {
			className: "space-y-3",
			children: itinerary.map((d) => /* @__PURE__ */ jsx("div", {
				className: "rounded-lg border bg-card/60 p-3",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsxs(Badge, { children: ["Day ", d.day_number] }), /* @__PURE__ */ jsx("span", {
									className: "font-medium",
									children: d.title
								})]
							}),
							d.location && /* @__PURE__ */ jsx("div", {
								className: "mt-0.5 text-xs text-muted-foreground",
								children: d.location
							}),
							d.description && /* @__PURE__ */ jsx("div", {
								className: "mt-2 whitespace-pre-wrap text-sm",
								children: d.description
							}),
							d.activities && /* @__PURE__ */ jsxs("div", {
								className: "mt-2 whitespace-pre-wrap text-sm text-muted-foreground",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "font-medium text-foreground",
										children: "Activities:"
									}),
									" ",
									d.activities
								]
							})
						]
					}), /* @__PURE__ */ jsx(Button, {
						variant: "ghost",
						size: "icon",
						onClick: () => del(d.id),
						children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
					})]
				})
			}, d.id))
		})]
	})] });
}
var CHECKLIST_TEMPLATE = [
	{
		category: "documents",
		item: "Passport copy received"
	},
	{
		category: "documents",
		item: "Visa (if required)"
	},
	{
		category: "travel",
		item: "Flight details shared"
	},
	{
		category: "travel",
		item: "Arrival time confirmed"
	},
	{
		category: "preferences",
		item: "Dietary requirements"
	},
	{
		category: "preferences",
		item: "Emergency contact"
	}
];
function ChecklistCard({ bookingId, items }) {
	const qc = useQueryClient();
	const [newItem, setNewItem] = useState("");
	const [newCat, setNewCat] = useState("general");
	const [saving, setSaving] = useState(false);
	async function toggle(id, val) {
		const { error } = await supabase.from("booking_checklist").update({ is_completed: val }).eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
	}
	async function add(item, category) {
		const { error } = await supabase.from("booking_checklist").insert({
			booking_id: bookingId,
			item,
			category
		});
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
	}
	async function addCustom(e) {
		e.preventDefault();
		if (!newItem.trim()) return;
		setSaving(true);
		await add(newItem.trim(), newCat);
		setSaving(false);
		setNewItem("");
	}
	async function loadTemplate() {
		if (items.length > 0 && !confirm("Add default checklist items?")) return;
		for (const t of CHECKLIST_TEMPLATE) await add(t.item, t.category);
	}
	async function del(id) {
		const { error } = await supabase.from("booking_checklist").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-checklist", bookingId] });
	}
	const done = items.filter((i) => i.is_completed).length;
	const grouped = items.reduce((acc, i) => {
		(acc[i.category] ??= []).push(i);
		return acc;
	}, {});
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsxs(CardHeader, {
		className: "flex flex-row items-center justify-between",
		children: [/* @__PURE__ */ jsxs(CardTitle, {
			className: "flex items-center gap-2",
			children: [
				/* @__PURE__ */ jsx(CheckSquare2, { className: "size-5" }),
				" Guest checklist ",
				/* @__PURE__ */ jsxs("span", {
					className: "text-sm text-muted-foreground",
					children: [
						"(",
						done,
						"/",
						items.length,
						")"
					]
				})
			]
		}), items.length === 0 && /* @__PURE__ */ jsx(Button, {
			size: "sm",
			variant: "outline",
			onClick: loadTemplate,
			children: "Load default"
		})]
	}), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-4",
		children: [/* @__PURE__ */ jsxs("form", {
			onSubmit: addCustom,
			className: "grid gap-2 sm:grid-cols-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-2",
					children: [/* @__PURE__ */ jsx(Label, { children: "Category" }), /* @__PURE__ */ jsx(Input, {
						value: newCat,
						onChange: (e) => setNewCat(e.target.value),
						maxLength: 40
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "sm:col-span-3",
					children: [/* @__PURE__ */ jsx(Label, { children: "Item" }), /* @__PURE__ */ jsx(Input, {
						value: newItem,
						onChange: (e) => setNewItem(e.target.value),
						placeholder: "e.g. Winter clothing size",
						maxLength: 200
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "flex items-end",
					children: /* @__PURE__ */ jsxs(Button, {
						type: "submit",
						className: "w-full",
						disabled: saving,
						children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
					})
				})
			]
		}), items.length === 0 ? /* @__PURE__ */ jsx("div", {
			className: "py-6 text-center text-sm text-muted-foreground",
			children: "No checklist items yet. Load the default set to start."
		}) : /* @__PURE__ */ jsx("div", {
			className: "space-y-3",
			children: Object.entries(grouped).map(([cat, list]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
				className: "mb-1 text-xs uppercase tracking-wide text-muted-foreground",
				children: cat
			}), /* @__PURE__ */ jsx("div", {
				className: "divide-y rounded-lg border",
				children: list.map((i) => /* @__PURE__ */ jsxs("label", {
					className: "flex items-center gap-3 px-3 py-2",
					children: [
						/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: i.is_completed,
							onChange: (e) => toggle(i.id, e.target.checked),
							className: "size-4 accent-primary"
						}),
						/* @__PURE__ */ jsx("span", {
							className: `flex-1 text-sm ${i.is_completed ? "text-muted-foreground line-through" : ""}`,
							children: i.item
						}),
						/* @__PURE__ */ jsx(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => del(i.id),
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5 text-destructive" })
						})
					]
				}, i.id))
			})] }, cat))
		})]
	})] });
}
function InstallmentsCard({ bookingId, installments, currency, sym }) {
	const qc = useQueryClient();
	const [label, setLabel] = useState("Deposit");
	const [amount, setAmount] = useState("");
	const [due, setDue] = useState("");
	const totalPlanned = installments.reduce((s, i) => s + Number(i.amount), 0);
	const totalPaid = installments.filter((i) => i.paid).reduce((s, i) => s + Number(i.amount), 0);
	const outstanding = totalPlanned - totalPaid;
	async function add(e) {
		e.preventDefault();
		if (!amount || !due) return;
		const { data: u } = await supabase.auth.getUser();
		const { error } = await supabase.from("booking_installments").insert({
			booking_id: bookingId,
			user_id: u.user.id,
			label,
			amount: Number(amount),
			due_date: due,
			currency
		});
		if (error) return toast.error(error.message);
		setAmount("");
		setDue("");
		qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
	}
	async function togglePaid(row) {
		const { error } = await supabase.from("booking_installments").update({
			paid: !row.paid,
			paid_at: !row.paid ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", row.id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
	}
	async function del(id) {
		if (!confirm("Delete installment?")) return;
		const { error } = await supabase.from("booking_installments").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-installments", bookingId] });
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(CalendarClock, { className: "size-5" }), " Payment schedule"]
	}) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-lg border bg-card/60 p-3",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted-foreground",
							children: "Planned"
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-xl font-semibold",
							children: [sym, totalPlanned.toFixed(2)]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-lg border bg-card/60 p-3",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted-foreground",
							children: "Received"
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-xl font-semibold text-primary",
							children: [sym, totalPaid.toFixed(2)]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-lg border bg-card/60 p-3",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted-foreground",
							children: "Outstanding"
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-xl font-semibold",
							children: [sym, outstanding.toFixed(2)]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: add,
				className: "grid gap-2 sm:grid-cols-[1fr_120px_160px_auto]",
				children: [
					/* @__PURE__ */ jsx(Input, {
						placeholder: "Label (Deposit, 2nd payment…)",
						value: label,
						onChange: (e) => setLabel(e.target.value)
					}),
					/* @__PURE__ */ jsx(Input, {
						type: "number",
						step: "0.01",
						placeholder: "Amount",
						value: amount,
						onChange: (e) => setAmount(e.target.value)
					}),
					/* @__PURE__ */ jsx(Input, {
						type: "date",
						value: due,
						onChange: (e) => setDue(e.target.value)
					}),
					/* @__PURE__ */ jsxs(Button, {
						type: "submit",
						size: "sm",
						children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
					})
				]
			}),
			installments.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "py-4 text-center text-sm text-muted-foreground",
				children: "No installments planned."
			}) : /* @__PURE__ */ jsx("div", {
				className: "space-y-2",
				children: installments.map((i) => {
					const overdue = !i.paid && new Date(i.due_date) < new Date((/* @__PURE__ */ new Date()).toDateString());
					return /* @__PURE__ */ jsxs("div", {
						className: `flex items-center justify-between gap-3 rounded-lg border p-3 ${i.paid ? "bg-muted/40" : overdue ? "border-destructive/60" : "bg-card/60"}`,
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsx(Button, {
								variant: i.paid ? "default" : "outline",
								size: "icon",
								className: "size-8",
								onClick: () => togglePaid(i),
								children: /* @__PURE__ */ jsx(Check, { className: "size-4" })
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "font-medium text-sm",
								children: i.label
							}), /* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted-foreground",
								children: [
									"Due ",
									i.due_date,
									" ",
									overdue && /* @__PURE__ */ jsx(Badge, {
										variant: "destructive",
										className: "ml-1",
										children: "Overdue"
									})
								]
							})] })]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "text-right",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "font-semibold",
									children: [sym, Number(i.amount).toFixed(2)]
								}), i.paid && i.paid_at && /* @__PURE__ */ jsxs("div", {
									className: "text-xs text-muted-foreground",
									children: ["Paid ", new Date(i.paid_at).toLocaleDateString()]
								})]
							}), /* @__PURE__ */ jsx(Button, {
								variant: "ghost",
								size: "icon",
								className: "size-7",
								onClick: () => del(i.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5 text-destructive" })
							})]
						})]
					}, i.id);
				})
			})
		]
	})] });
}
function CommissionsCard({ bookingId, commissions, currency, sym }) {
	const qc = useQueryClient();
	const [agent, setAgent] = useState("");
	const [rate, setRate] = useState("");
	const [amount, setAmount] = useState("");
	const totalPending = commissions.filter((c) => c.status !== "paid").reduce((s, c) => s + Number(c.amount), 0);
	const totalPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
	async function add(e) {
		e.preventDefault();
		if (!agent || !amount && !rate) return;
		const { data: u } = await supabase.auth.getUser();
		const { error } = await supabase.from("commissions").insert({
			booking_id: bookingId,
			user_id: u.user.id,
			agent_name: agent,
			rate_percent: rate ? Number(rate) : null,
			amount: Number(amount || 0),
			currency
		});
		if (error) return toast.error(error.message);
		setAgent("");
		setRate("");
		setAmount("");
		qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
	}
	async function markPaid(row) {
		const paid = row.status !== "paid";
		const { error } = await supabase.from("commissions").update({
			status: paid ? "paid" : "pending",
			paid_at: paid ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", row.id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
	}
	async function del(id) {
		if (!confirm("Delete commission?")) return;
		const { error } = await supabase.from("commissions").delete().eq("id", id);
		if (error) return toast.error(error.message);
		qc.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(Handshake, { className: "size-5" }), " Agent commissions"]
	}) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border bg-card/60 p-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "Pending payout"
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xl font-semibold",
						children: [sym, totalPending.toFixed(2)]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border bg-card/60 p-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "Paid out"
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xl font-semibold text-primary",
						children: [sym, totalPaid.toFixed(2)]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: add,
				className: "grid gap-2 sm:grid-cols-[1.5fr_100px_120px_auto]",
				children: [
					/* @__PURE__ */ jsx(Input, {
						placeholder: "Agent / partner name",
						value: agent,
						onChange: (e) => setAgent(e.target.value)
					}),
					/* @__PURE__ */ jsx(Input, {
						type: "number",
						step: "0.1",
						placeholder: "Rate %",
						value: rate,
						onChange: (e) => setRate(e.target.value)
					}),
					/* @__PURE__ */ jsx(Input, {
						type: "number",
						step: "0.01",
						placeholder: "Amount",
						value: amount,
						onChange: (e) => setAmount(e.target.value)
					}),
					/* @__PURE__ */ jsxs(Button, {
						type: "submit",
						size: "sm",
						children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
					})
				]
			}),
			commissions.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "py-4 text-center text-sm text-muted-foreground",
				children: "No commissions yet."
			}) : /* @__PURE__ */ jsx("div", {
				className: "space-y-2",
				children: commissions.map((c) => /* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-3 rounded-lg border bg-card/60 p-3",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "font-medium text-sm",
						children: c.agent_name
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground",
						children: [c.rate_percent ? `${c.rate_percent}% · ` : "", /* @__PURE__ */ jsx(Badge, {
							variant: c.status === "paid" ? "default" : "secondary",
							className: "ml-1",
							children: c.status
						})]
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "font-semibold",
								children: [sym, Number(c.amount).toFixed(2)]
							}),
							/* @__PURE__ */ jsx(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => markPaid(c),
								children: c.status === "paid" ? "Undo" : "Mark paid"
							}),
							/* @__PURE__ */ jsx(Button, {
								variant: "ghost",
								size: "icon",
								className: "size-7",
								onClick: () => del(c.id),
								children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5 text-destructive" })
							})
						]
					})]
				}, c.id))
			})
		]
	})] });
}
function WhatsAppCard({ booking, sym, totalSell }) {
	const name = booking?.customer?.name ?? "there";
	const first = String(name).split(" ")[0];
	const pkg = booking?.package?.name ?? "your tour";
	const start = booking?.start_date ?? "";
	const travelers = booking?.travelers ?? 1;
	const phone = (booking?.customer?.phone ?? "").replace(/[^\d]/g, "");
	const templates = [
		{
			key: "quote",
			label: "Send quote",
			msg: `Hi ${first}! 👋\n\nThank you for your interest in *${pkg}* with Trekking Trails Travels. Here's your personalized quote:\n\n📅 Departure: ${start}\n👥 Travelers: ${travelers}\n💰 Total: ${sym}${totalSell.toFixed(2)}\n\nLet me know if you'd like to proceed or have any questions. We can hold this rate for 48 hours. ✨`
		},
		{
			key: "deposit",
			label: "Deposit reminder",
			msg: `Hi ${first}! Just a friendly reminder to confirm your *${pkg}* trip on ${start}, please complete the deposit payment at your earliest convenience. Reply here if you need the payment link again. 🙏`
		},
		{
			key: "balance",
			label: "Balance due",
			msg: `Hi ${first}! Your *${pkg}* departure on ${start} is coming up soon. Kindly clear the outstanding balance so we can finalize all arrangements. Thank you! 🌌`
		},
		{
			key: "predep",
			label: "Pre-departure info",
			msg: `Hi ${first}! Your *${pkg}* adventure starts on ${start} — we can't wait! 🎉\n\nA quick pre-departure checklist:\n• Passport valid 6+ months\n• Warm layers & thermals\n• Travel insurance copy\n• Pickup details will follow separately\n\nSafe travels! ❄️`
		},
		{
			key: "review",
			label: "Post-trip thank you",
			msg: `Hi ${first}! It was a pleasure hosting you on *${pkg}*. 🙌 If you enjoyed the experience, a quick Google review would mean the world to our small team. Hope to see you again in Finland!`
		}
	];
	function send(msg) {
		if (!phone) return toast.error("No phone number on this customer");
		const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
		window.open(url, "_blank", "noopener");
	}
	return /* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ jsx(Send, { className: "size-5" }), " WhatsApp templates"]
	}) }), /* @__PURE__ */ jsxs(CardContent, {
		className: "space-y-3",
		children: [!phone && /* @__PURE__ */ jsx("p", {
			className: "text-xs text-destructive",
			children: "Add a phone number to the customer to enable one-click WhatsApp send."
		}), /* @__PURE__ */ jsx("div", {
			className: "grid gap-2 sm:grid-cols-2",
			children: templates.map((t) => /* @__PURE__ */ jsxs("div", {
				className: "rounded-lg border p-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-2 flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-sm font-medium",
						children: t.label
					}), /* @__PURE__ */ jsxs(Button, {
						size: "sm",
						variant: "secondary",
						disabled: !phone,
						onClick: () => send(t.msg),
						children: [/* @__PURE__ */ jsx(Send, { className: "size-3" }), " Send"]
					})]
				}), /* @__PURE__ */ jsx("p", {
					className: "line-clamp-3 whitespace-pre-line text-xs text-muted-foreground",
					children: t.msg
				})]
			}, t.key))
		})]
	})] });
}
//#endregion
export { BookingDetail as component };

import { t as supabase } from "./client-CROz1RyC.js";
import { t as Button } from "./button-Bq5vK6RO.js";
import { n as Input, t as Label } from "./label-B7oQAA24.js";
import { t as Textarea } from "./textarea-kko37XEX.js";
import { n as CardContent, t as Card } from "./card-CtX3ithx.js";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CYB-gyWu.js";
import { t as Badge } from "./badge-D1Dupn2y.js";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogFooter, t as Dialog } from "./dialog-B8mBdC_P.js";
import { useEffect, useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
//#region src/lib/invoice-pdf.ts
function downloadInvoicePdf(inv, company = "Aurora Finland Tours") {
	const doc = new jsPDF();
	const fmt = (n) => `${inv.currency} ${Number(n).toFixed(2)}`;
	doc.setFontSize(22);
	doc.setTextColor(20, 30, 70);
	doc.text(company, 14, 20);
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 110);
	doc.text("Finland Tour Operator", 14, 26);
	doc.setFontSize(28);
	doc.setTextColor(20, 30, 70);
	doc.text("INVOICE", 196, 22, { align: "right" });
	doc.setFontSize(10);
	doc.setTextColor(90, 90, 110);
	doc.text(`# ${inv.invoice_number}`, 196, 28, { align: "right" });
	doc.text(`Status: ${inv.status.toUpperCase()}`, 196, 33, { align: "right" });
	doc.setDrawColor(220);
	doc.line(14, 40, 196, 40);
	doc.setFontSize(9);
	doc.setTextColor(120);
	doc.text("BILL TO", 14, 48);
	doc.text("ISSUE DATE", 120, 48);
	doc.text("DUE DATE", 165, 48);
	doc.setFontSize(11);
	doc.setTextColor(20, 30, 70);
	doc.text(inv.customer.name, 14, 55);
	doc.setFontSize(9);
	doc.setTextColor(70);
	let yy = 60;
	if (inv.customer.email) {
		doc.text(inv.customer.email, 14, yy);
		yy += 5;
	}
	if (inv.customer.phone) {
		doc.text(inv.customer.phone, 14, yy);
		yy += 5;
	}
	if (inv.customer.country) doc.text(inv.customer.country, 14, yy);
	doc.setFontSize(11);
	doc.setTextColor(20, 30, 70);
	doc.text(inv.issue_date, 120, 55);
	doc.text(inv.due_date ?? "—", 165, 55);
	autoTable(doc, {
		startY: 82,
		head: [[
			"Description",
			"Qty",
			"Unit price",
			"Total"
		]],
		body: inv.line_items.map((l) => [
			l.description,
			String(l.quantity),
			fmt(l.unit_price),
			fmt(l.quantity * l.unit_price)
		]),
		theme: "striped",
		headStyles: {
			fillColor: [
				30,
				40,
				90
			],
			textColor: 255
		},
		styles: { fontSize: 10 },
		columnStyles: {
			1: { halign: "right" },
			2: { halign: "right" },
			3: { halign: "right" }
		}
	});
	const endY = doc.lastAutoTable.finalY + 8;
	const rightX = 196;
	const labelX = 140;
	doc.setFontSize(10);
	doc.setTextColor(80);
	doc.text("Subtotal", labelX, endY);
	doc.text(fmt(inv.subtotal), rightX, endY, { align: "right" });
	doc.text(`Tax (${inv.tax_rate}%)`, labelX, endY + 6);
	doc.text(fmt(inv.tax_amount), rightX, endY + 6, { align: "right" });
	doc.setFontSize(13);
	doc.setTextColor(20, 30, 70);
	doc.text("TOTAL", labelX, endY + 16);
	doc.text(fmt(inv.total), rightX, endY + 16, { align: "right" });
	if (inv.notes) {
		doc.setFontSize(9);
		doc.setTextColor(120);
		doc.text("Notes", 14, endY + 30);
		doc.setTextColor(60);
		doc.text(doc.splitTextToSize(inv.notes, 180), 14, endY + 36);
	}
	doc.setFontSize(9);
	doc.setTextColor(150);
	doc.text("Thank you for choosing us for your Finland adventure.", 105, 285, { align: "center" });
	doc.save(`invoice-${inv.invoice_number}.pdf`);
}
//#endregion
//#region src/routes/_authenticated/invoices.tsx?tsr-split=component
function InvoicesPage() {
	const qc = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["invoices"],
		queryFn: async () => {
			const { data } = await supabase.from("invoices").select("*, customer:customers(name, email, phone, country)").order("issue_date", { ascending: false });
			return data ?? [];
		}
	});
	const { data: payments } = useQuery({
		queryKey: ["payments"],
		queryFn: async () => (await supabase.from("payments").select("invoice_id,amount")).data ?? []
	});
	const paidByInvoice = /* @__PURE__ */ new Map();
	(payments ?? []).forEach((p) => paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount)));
	const { data: customers } = useQuery({
		queryKey: ["customers-lite"],
		queryFn: async () => (await supabase.from("customers").select("id,name,email,phone,country").order("name")).data ?? []
	});
	const { data: bookings } = useQuery({
		queryKey: ["bookings-lite"],
		queryFn: async () => (await supabase.from("bookings").select("id, customer_id, total_amount, travelers, package:tour_packages(name, price_per_person)").order("start_date", { ascending: false })).data ?? []
	});
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState(null);
	const [payingInvoice, setPayingInvoice] = useState(null);
	async function remove(id) {
		if (!confirm("Delete invoice?")) return;
		const { error } = await supabase.from("invoices").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		qc.invalidateQueries({ queryKey: ["invoices"] });
		qc.invalidateQueries({ queryKey: ["dashboard"] });
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-4xl text-primary",
					children: "Invoices"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground",
					children: "Generate and download invoices as PDF."
				})] }), /* @__PURE__ */ jsxs(Button, {
					onClick: () => {
						setEditing(null);
						setOpen(true);
					},
					children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " New invoice"]
				})]
			}),
			/* @__PURE__ */ jsx(InvoiceDialog, {
				open,
				onOpenChange: setOpen,
				editing,
				customers: customers ?? [],
				bookings: bookings ?? [],
				onSaved: () => {
					qc.invalidateQueries({ queryKey: ["invoices"] });
					qc.invalidateQueries({ queryKey: ["dashboard"] });
				}
			}),
			isLoading ? /* @__PURE__ */ jsx("div", {
				className: "py-12 text-center text-muted-foreground",
				children: "Loading…"
			}) : !data?.length ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, {
				className: "py-16 text-center",
				children: /* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground",
					children: "No invoices yet."
				})
			}) }) : /* @__PURE__ */ jsx("div", {
				className: "space-y-3",
				children: data.map((inv) => {
					const paidAmt = paidByInvoice.get(inv.id) ?? 0;
					const balance = Number(inv.total) - paidAmt;
					return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, {
						className: "flex flex-wrap items-center justify-between gap-4 p-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "font-mono text-sm",
											children: inv.invoice_number
										}), /* @__PURE__ */ jsx(StatusBadge, { status: inv.status })]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "mt-1 font-semibold",
										children: inv.customer?.name
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "text-xs text-muted-foreground",
										children: [
											"Issued ",
											inv.issue_date,
											" · Due ",
											inv.due_date ?? "—"
										]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "text-right",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "text-lg font-semibold text-primary",
									children: [
										inv.currency,
										" ",
										Number(inv.total).toFixed(2)
									]
								}), paidAmt > 0 && /* @__PURE__ */ jsxs("div", {
									className: "text-xs text-muted-foreground",
									children: [
										"Paid €",
										paidAmt.toFixed(2),
										" · ",
										/* @__PURE__ */ jsxs("span", {
											className: balance > .01 ? "text-warning font-medium" : "text-success font-medium",
											children: ["Bal €", balance.toFixed(2)]
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex gap-1",
								children: [
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "ghost",
										title: "Record payment",
										onClick: () => setPayingInvoice(inv),
										children: /* @__PURE__ */ jsx(Wallet, { className: "size-4" })
									}),
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "ghost",
										title: "Download PDF",
										onClick: () => {
											if (!inv.customer) return toast.error("Customer missing");
											downloadInvoicePdf({
												...inv,
												line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
												customer: inv.customer
											});
										},
										children: /* @__PURE__ */ jsx(Download, { className: "size-4" })
									}),
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => {
											setEditing(inv);
											setOpen(true);
										},
										children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" })
									}),
									/* @__PURE__ */ jsx(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => remove(inv.id),
										children: /* @__PURE__ */ jsx(Trash2, { className: "size-4 text-destructive" })
									})
								]
							})
						]
					}) }, inv.id);
				})
			}),
			/* @__PURE__ */ jsx(PaymentDialog, {
				invoice: payingInvoice,
				alreadyPaid: payingInvoice ? paidByInvoice.get(payingInvoice.id) ?? 0 : 0,
				onClose: () => setPayingInvoice(null),
				onSaved: () => {
					qc.invalidateQueries({ queryKey: ["payments"] });
					qc.invalidateQueries({ queryKey: ["invoices"] });
					qc.invalidateQueries({ queryKey: ["dashboard"] });
				}
			})
		]
	});
}
function StatusBadge({ status }) {
	return /* @__PURE__ */ jsx(Badge, {
		className: {
			draft: "bg-muted text-muted-foreground",
			sent: "bg-accent text-accent-foreground",
			paid: "bg-success text-success-foreground",
			overdue: "bg-warning text-warning-foreground",
			cancelled: "bg-destructive/10 text-destructive"
		}[status],
		variant: "secondary",
		children: status
	});
}
function InvoiceDialog({ open, onOpenChange, editing, customers, bookings, onSaved }) {
	const [customerId, setCustomerId] = useState("");
	const [bookingId, setBookingId] = useState("");
	const [issueDate, setIssueDate] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [taxRate, setTaxRate] = useState("0");
	const [status, setStatus] = useState("draft");
	const [notes, setNotes] = useState("");
	const [lines, setLines] = useState([{
		description: "",
		quantity: 1,
		unit_price: 0
	}]);
	useEffect(() => {
		if (!open) return;
		const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		setCustomerId(editing?.customer_id ?? "");
		setBookingId(editing?.booking_id ?? "");
		setIssueDate(editing?.issue_date ?? today);
		setDueDate(editing?.due_date ?? "");
		setTaxRate(String(editing?.tax_rate ?? 0));
		setStatus(editing?.status ?? "draft");
		setNotes(editing?.notes ?? "");
		setLines(editing && Array.isArray(editing.line_items) && editing.line_items.length ? editing.line_items : [{
			description: "",
			quantity: 1,
			unit_price: 0
		}]);
	}, [open, editing]);
	useEffect(() => {
		if (!bookingId || editing) return;
		const b = bookings.find((x) => x.id === bookingId);
		if (!b) return;
		setCustomerId(b.customer_id);
		setLines([{
			description: `${b.package?.name ?? "Tour package"} — ${b.travelers} traveler(s)`,
			quantity: b.travelers,
			unit_price: b.package?.price_per_person ?? b.total_amount / (b.travelers || 1)
		}]);
	}, [
		bookingId,
		bookings,
		editing
	]);
	const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), [lines]);
	const taxAmount = useMemo(() => subtotal * (Number(taxRate) || 0) / 100, [subtotal, taxRate]);
	const total = subtotal + taxAmount;
	function updateLine(i, patch) {
		setLines((prev) => prev.map((l, idx) => idx === i ? {
			...l,
			...patch
		} : l));
	}
	async function submit(e) {
		e.preventDefault();
		if (!customerId) return toast.error("Customer required");
		if (!lines.some((l) => l.description.trim())) return toast.error("At least one line item");
		const { data: userData } = await supabase.auth.getUser();
		let invoice_number = editing?.invoice_number;
		if (!invoice_number) {
			const { data: n, error: nErr } = await supabase.rpc("next_invoice_number");
			if (nErr || n == null) return toast.error(nErr?.message ?? "Failed to generate number");
			invoice_number = `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(n).padStart(4, "0")}`;
		}
		const payload = {
			user_id: userData.user.id,
			invoice_number,
			customer_id: customerId,
			booking_id: bookingId || null,
			issue_date: issueDate,
			due_date: dueDate || null,
			subtotal,
			tax_rate: Number(taxRate) || 0,
			tax_amount: taxAmount,
			total,
			currency: "EUR",
			status,
			notes: notes || null,
			line_items: lines.filter((l) => l.description.trim())
		};
		const { error } = editing ? await supabase.from("invoices").update(payload).eq("id", editing.id) : await supabase.from("invoices").insert(payload);
		if (error) return toast.error(error.message);
		toast.success(editing ? "Invoice updated" : "Invoice created");
		onOpenChange(false);
		onSaved();
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "max-h-[90vh] max-w-2xl overflow-y-auto",
			children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? `Edit ${editing.invoice_number}` : "New invoice" }) }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "From booking (optional)" }), /* @__PURE__ */ jsxs(Select, {
							value: bookingId,
							onValueChange: setBookingId,
							disabled: !!editing,
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "—" }) }), /* @__PURE__ */ jsx(SelectContent, { children: bookings.map((b) => /* @__PURE__ */ jsxs(SelectItem, {
								value: b.id,
								children: [
									b.package?.name ?? "Booking",
									" · €",
									Number(b.total_amount).toFixed(0)
								]
							}, b.id)) })]
						})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Customer" }), /* @__PURE__ */ jsxs(Select, {
							value: customerId,
							onValueChange: setCustomerId,
							children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select" }) }), /* @__PURE__ */ jsx(SelectContent, { children: customers.map((c) => /* @__PURE__ */ jsx(SelectItem, {
								value: c.id,
								children: c.name
							}, c.id)) })]
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "issue",
								children: "Issue date"
							}), /* @__PURE__ */ jsx(Input, {
								id: "issue",
								type: "date",
								value: issueDate,
								onChange: (e) => setIssueDate(e.target.value),
								required: true
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "due",
								children: "Due date"
							}), /* @__PURE__ */ jsx(Input, {
								id: "due",
								type: "date",
								value: dueDate,
								onChange: (e) => setDueDate(e.target.value)
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Status" }), /* @__PURE__ */ jsxs(Select, {
								value: status,
								onValueChange: (v) => setStatus(v),
								children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: [
									"draft",
									"sent",
									"paid",
									"overdue",
									"cancelled"
								].map((s) => /* @__PURE__ */ jsx(SelectItem, {
									value: s,
									children: s
								}, s)) })]
							})] })
						]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Line items" }), /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [lines.map((l, i) => /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-[1fr_70px_100px_auto] gap-2",
							children: [
								/* @__PURE__ */ jsx(Input, {
									placeholder: "Description",
									value: l.description,
									onChange: (e) => updateLine(i, { description: e.target.value })
								}),
								/* @__PURE__ */ jsx(Input, {
									type: "number",
									min: 1,
									value: l.quantity,
									onChange: (e) => updateLine(i, { quantity: Number(e.target.value) || 0 })
								}),
								/* @__PURE__ */ jsx(Input, {
									type: "number",
									min: 0,
									step: "0.01",
									value: l.unit_price,
									onChange: (e) => updateLine(i, { unit_price: Number(e.target.value) || 0 })
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "icon",
									variant: "ghost",
									onClick: () => setLines(lines.filter((_, x) => x !== i)),
									disabled: lines.length === 1,
									children: /* @__PURE__ */ jsx(X, { className: "size-4" })
								})
							]
						}, i)), /* @__PURE__ */ jsxs(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							onClick: () => setLines([...lines, {
								description: "",
								quantity: 1,
								unit_price: 0
							}]),
							children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add line"]
						})]
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "tax",
							children: "Tax rate (%)"
						}), /* @__PURE__ */ jsx(Input, {
							id: "tax",
							type: "number",
							min: 0,
							step: "0.01",
							value: taxRate,
							onChange: (e) => setTaxRate(e.target.value)
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "rounded-lg border bg-muted/40 p-3 text-sm",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ jsx("span", { children: "Subtotal" }), /* @__PURE__ */ jsxs("span", { children: ["€", subtotal.toFixed(2)] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ jsx("span", { children: "Tax" }), /* @__PURE__ */ jsxs("span", { children: ["€", taxAmount.toFixed(2)] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1 flex justify-between font-semibold text-primary",
									children: [/* @__PURE__ */ jsx("span", { children: "Total" }), /* @__PURE__ */ jsxs("span", { children: ["€", total.toFixed(2)] })]
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "notes",
						children: "Notes"
					}), /* @__PURE__ */ jsx(Textarea, {
						id: "notes",
						value: notes,
						onChange: (e) => setNotes(e.target.value),
						rows: 2
					})] }),
					/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Save invoice"
					}) })
				]
			})]
		})
	});
}
function PaymentDialog({ invoice, alreadyPaid, onClose, onSaved }) {
	const [amount, setAmount] = useState("");
	const [method, setMethod] = useState("bank_transfer");
	const [date, setDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [reference, setReference] = useState("");
	useEffect(() => {
		if (invoice) {
			const bal = Number(invoice.total) - alreadyPaid;
			setAmount(bal > 0 ? bal.toFixed(2) : "");
			setDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
			setReference("");
		}
	}, [invoice, alreadyPaid]);
	if (!invoice) return null;
	const balance = Number(invoice.total) - alreadyPaid;
	async function submit(e) {
		e.preventDefault();
		if (!invoice) return;
		const amt = Number(amount);
		if (!amt || amt <= 0) return toast.error("Enter a valid amount");
		const { data: u } = await supabase.auth.getUser();
		const { error } = await supabase.from("payments").insert({
			user_id: u.user.id,
			invoice_id: invoice.id,
			amount: amt,
			method,
			payment_date: date,
			reference: reference || null
		});
		if (error) return toast.error(error.message);
		if (alreadyPaid + amt >= Number(invoice.total) - .01) await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice.id);
		toast.success("Payment recorded");
		onSaved();
		onClose();
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open: !!invoice,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ jsxs(DialogContent, { children: [
			/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: ["Record payment · ", invoice.invoice_number] }) }),
			/* @__PURE__ */ jsxs("div", {
				className: "mb-3 rounded-lg bg-muted/40 p-3 text-sm",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ jsx("span", { children: "Invoice total" }), /* @__PURE__ */ jsxs("span", { children: ["€", Number(invoice.total).toFixed(2)] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ jsx("span", { children: "Already paid" }), /* @__PURE__ */ jsxs("span", { children: ["€", alreadyPaid.toFixed(2)] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-1 flex justify-between font-semibold",
						children: [/* @__PURE__ */ jsx("span", { children: "Balance" }), /* @__PURE__ */ jsxs("span", { children: ["€", balance.toFixed(2)] })]
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "amt",
							children: "Amount"
						}), /* @__PURE__ */ jsx(Input, {
							id: "amt",
							type: "number",
							step: "0.01",
							min: .01,
							value: amount,
							onChange: (e) => setAmount(e.target.value),
							required: true
						})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "pdate",
							children: "Date"
						}), /* @__PURE__ */ jsx(Input, {
							id: "pdate",
							type: "date",
							value: date,
							onChange: (e) => setDate(e.target.value),
							required: true
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, { children: "Method" }), /* @__PURE__ */ jsxs(Select, {
						value: method,
						onValueChange: setMethod,
						children: [/* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }), /* @__PURE__ */ jsx(SelectContent, { children: [
							"cash",
							"bank_transfer",
							"card",
							"stripe",
							"paypal",
							"other"
						].map((m) => /* @__PURE__ */ jsx(SelectItem, {
							value: m,
							children: m.replace("_", " ")
						}, m)) })]
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "ref",
						children: "Reference (optional)"
					}), /* @__PURE__ */ jsx(Input, {
						id: "ref",
						value: reference,
						onChange: (e) => setReference(e.target.value)
					})] }),
					/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Record payment"
					}) })
				]
			})
		] })
	});
}
//#endregion
export { InvoicesPage as component };

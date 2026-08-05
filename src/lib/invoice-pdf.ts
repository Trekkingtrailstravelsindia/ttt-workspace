import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type InvoiceLine = { description: string; quantity: number; unit_price: number };

export type InvoiceForPdf = {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  notes: string | null;
  line_items: InvoiceLine[];
  customer: { name: string; email: string | null; phone: string | null; country: string | null };
};

export function downloadInvoicePdf(inv: InvoiceForPdf, company = "Aurora Finland Tours") {
  const doc = new jsPDF();
  const fmt = (n: number) => `${inv.currency} ${Number(n).toFixed(2)}`;

  // Header
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

  // Meta
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
  if (inv.customer.email) { doc.text(inv.customer.email, 14, yy); yy += 5; }
  if (inv.customer.phone) { doc.text(inv.customer.phone, 14, yy); yy += 5; }
  if (inv.customer.country) { doc.text(inv.customer.country, 14, yy); }

  doc.setFontSize(11);
  doc.setTextColor(20, 30, 70);
  doc.text(inv.issue_date, 120, 55);
  doc.text(inv.due_date ?? "—", 165, 55);

  // Line items
  autoTable(doc, {
    startY: 82,
    head: [["Description", "Qty", "Unit price", "Total"]],
    body: inv.line_items.map((l) => [
      l.description,
      String(l.quantity),
      fmt(l.unit_price),
      fmt(l.quantity * l.unit_price),
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 40, 90], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
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

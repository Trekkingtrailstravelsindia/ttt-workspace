import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ItineraryDay = {
  day_number: number;
  title: string;
  location: string | null;
  description: string | null;
  activities: string | null;
};

export type ItineraryForPdf = {
  customer: { name: string; email: string | null } | null;
  package: { name: string; duration_days: number } | null;
  start_date: string;
  end_date: string | null;
  travelers: number;
  days: ItineraryDay[];
};

export function downloadItineraryPdf(data: ItineraryForPdf, company = "Aurora Finland Tours") {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(20, 30, 70);
  doc.text(company, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 110);
  doc.text("Your Finland journey", 14, 26);

  doc.setFontSize(24);
  doc.setTextColor(20, 30, 70);
  doc.text("ITINERARY", 196, 22, { align: "right" });

  // Trip summary
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 70);
  doc.text(data.package?.name ?? "Custom tour", 14, 42);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 100);
  const guest = data.customer?.name ?? "Guest";
  const dates = `${data.start_date}${data.end_date ? ` → ${data.end_date}` : ""}`;
  doc.text(`Guest: ${guest}    |    Travelers: ${data.travelers}    |    ${dates}`, 14, 48);

  // Days
  const rows = data.days
    .sort((a, b) => a.day_number - b.day_number)
    .map(d => [
      `Day ${d.day_number}`,
      d.title + (d.location ? `\n${d.location}` : ""),
      [d.description, d.activities].filter(Boolean).join("\n\n"),
    ]);

  autoTable(doc, {
    startY: 58,
    head: [["Day", "Highlight", "Details"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [20, 30, 70], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: "bold" },
      1: { cellWidth: 55 },
      2: { cellWidth: "auto" },
    },
  });

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 140);
  doc.text(`Prepared by ${company}`, 14, 285);

  doc.save(`Itinerary_${(data.customer?.name ?? "guest").replace(/\s+/g, "_")}.pdf`);
}

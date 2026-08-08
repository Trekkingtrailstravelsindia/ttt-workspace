import { INVOICE_LOGO, INVOICE_STAMP_LOGO } from "./invoice-assets";

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
  // Optional booking context — populates the trip strip + booking reference.
  booking?: {
    reference?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    travelers?: number | null;
    package_name?: string | null;
    location?: string | null;
    booked_via?: string | null;
  } | null;
  // Optional Flywire (or any) payment link for the installment "Pay here" buttons.
  payment_link?: string | null;
};

// ---- Company identity (issuing entity on the invoice) ----
const COMPANY = {
  name1: "VISIT LAPLAND",
  name2: "FINLAND",
  name3: "TRAVELS",
  suffix: "Oy",
  tagline: "Your Trusted Travel Partner for Finland & Lapland",
  businessId: "3376481-6",
  address: "Ruka – Kuusamo, 93600, Lapland, Finland",
  email: "info@laplandfinlandtravels.com",
  phone: "+358 46 563 0404",
  website: "laplandfinlandtravels.com",
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function fmtMoney(currency: string, n: number) {
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "";
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0),
  );
  return sym ? `${sym} ${num}` : `${currency} ${num}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRange(a?: string | null, b?: string | null) {
  if (!a && !b) return "—";
  if (a && b) {
    const da = new Date(a), db = new Date(b);
    if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
      const sameMonth = da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
      const left = da.toLocaleDateString("en-GB", { day: "2-digit", ...(sameMonth ? {} : { month: "short" }) });
      const right = db.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      return `${left} – ${right}`;
    }
  }
  return fmtDate(a || b);
}

export function renderInvoiceHtml(inv: InvoiceForPdf): string {
  const cur = inv.currency || "EUR";
  const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
  const subtotal = Number(inv.subtotal ?? lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const total = Number(inv.total ?? subtotal + (inv.tax_amount || 0));
  const hasTax = Number(inv.tax_amount || 0) > 0;

  // Standard 20 / 30 / 50 booking schedule computed from the total.
  const dueNow = total * 0.2;
  const next30 = total * 0.3;
  const final50 = total * 0.5;

  const b = inv.booking || {};
  const bookingRef =
    b.reference || `BK-${(inv.invoice_number || "").replace(/^[A-Za-z]+-?/, "") || "—"}`;
  const packageName = b.package_name || (lines[0]?.description ?? "Custom Tour Package");
  const destination = b.location || "Lapland, Finland";
  const travellers = b.travelers ? `${b.travelers} ${b.travelers > 1 ? "Travellers" : "Traveller"}` : "—";
  const bookedVia = b.booked_via || "Direct Booking";
  const payLink = inv.payment_link || "";
  const payA = (amt: number) =>
    payLink
      ? `<a href="${esc(payLink)}" style="color:var(--aurora-teal);font-weight:700">Pay here</a>`
      : `<span style="color:var(--muted)">—</span>`;

  const rows = lines
    .map(
      (l) => `
        <tr>
          <td><div class="svc">${esc(l.description)}</div></td>
          <td>${esc(fmtRange(b.start_date, b.end_date))}</td>
          <td class="r">${esc(l.quantity)}</td>
          <td class="r">${esc(fmtMoney(cur, l.unit_price).replace(/^[^\d]+/, ""))}</td>
          <td>${esc(fmtMoney(cur, l.quantity * l.unit_price).replace(/^[^\d]+/, ""))}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${esc(inv.invoice_number)} — ${COMPANY.name1} ${COMPANY.name2} ${COMPANY.name3} ${COMPANY.suffix}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --arctic-night:#0B1F33; --aurora-green:#3DDC97; --aurora-teal:#1FB6A6;
    --ice:#EAF3F6; --snow:#FFFFFF; --ink:#16222E; --muted:#5E7180; --line:#D7E3E9;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;color:var(--ink);background:#CBD8DE;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{width:210mm;min-height:297mm;margin:24px auto;background:var(--snow);box-shadow:0 10px 40px rgba(11,31,51,.25);display:flex;flex-direction:column;}
  .head{background:var(--arctic-night);color:var(--snow);padding:34px 44px 30px;position:relative;overflow:hidden;}
  .head::after{content:"";position:absolute;top:-60px;right:-80px;width:420px;height:260px;background:radial-gradient(ellipse at 70% 30%, rgba(61,220,151,.55), transparent 60%),radial-gradient(ellipse at 40% 60%, rgba(31,182,166,.35), transparent 65%),radial-gradient(ellipse at 85% 70%, rgba(118,99,255,.25), transparent 60%);filter:blur(6px);transform:rotate(-8deg);pointer-events:none;}
  .head-row{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
  .brand-block{display:flex;align-items:flex-start;gap:18px}
  .logo{width:108px;height:auto;mix-blend-mode:screen;filter:drop-shadow(0 0 14px rgba(61,220,151,.25));flex-shrink:0;margin-top:-6px;}
  .brand-name{font-family:'Fraunces',serif;font-weight:700;font-size:25px;letter-spacing:.02em;line-height:1.15;}
  .brand-name span{color:var(--aurora-green)}
  .tagline{margin-top:6px;font-size:11.5px;font-weight:500;letter-spacing:.06em;color:#B8CBD8;}
  .brand-meta{margin-top:14px;font-size:10.5px;line-height:1.7;color:#9FB4C2;}
  .brand-meta strong{color:#D6E4ED;font-weight:600}
  .doc-badge{text-align:right}
  .doc-badge .word{font-family:'Fraunces',serif;font-size:38px;font-weight:600;letter-spacing:.08em;color:var(--snow);}
  .doc-badge .num{margin-top:8px;font-size:12px;color:#B8CBD8;line-height:1.8;}
  .doc-badge .num b{color:var(--aurora-green);font-weight:600}
  .parties{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:28px;padding:30px 44px 8px;}
  .label{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--aurora-teal);margin-bottom:8px;}
  .party p{font-size:11.5px;line-height:1.75;color:var(--ink)}
  .party .name{font-weight:700;font-size:13px}
  .kv{font-size:11.5px;line-height:1.9}
  .kv b{display:inline-block;min-width:92px;color:var(--muted);font-weight:500}
  .trip{margin:22px 44px 0;background:var(--ice);border:1px solid var(--line);border-radius:10px;display:grid;grid-template-columns:repeat(4,1fr);padding:14px 20px;gap:12px;}
  .trip div small{display:block;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;}
  .trip div span{font-size:12px;font-weight:600}
  .items{padding:24px 44px 0;flex:1}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  thead th{text-align:left;font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--snow);background:var(--arctic-night);padding:10px 12px;}
  thead th:first-child{border-radius:8px 0 0 8px}
  thead th:last-child{border-radius:0 8px 8px 0;text-align:right}
  tbody td{padding:13px 12px;border-bottom:1px solid var(--line);vertical-align:top;}
  tbody td:last-child, tbody td.r{text-align:right;font-variant-numeric:tabular-nums}
  td .svc{font-weight:600}
  td .det{color:var(--muted);font-size:10.5px;margin-top:3px;line-height:1.5}
  .totals-wrap{display:flex;justify-content:flex-end;padding:18px 44px 0}
  .totals{width:320px;font-size:12px}
  .totals .row{display:flex;justify-content:space-between;padding:7px 12px;}
  .totals .row span:last-child{font-variant-numeric:tabular-nums}
  .totals .grand{margin-top:6px;background:linear-gradient(90deg,var(--aurora-teal),var(--aurora-green));color:var(--arctic-night);border-radius:8px;font-weight:700;font-size:15px;padding:12px;}
  .footer-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:26px 44px;}
  .pay-box{background:var(--ice);border:1px solid var(--line);border-radius:10px;padding:16px 20px;}
  .pay-box .kv b{min-width:120px}
  .terms{font-size:10px;color:var(--muted);line-height:1.7}
  .terms ul{margin-left:14px}
  .stamp-area{display:flex;align-items:center;justify-content:center;margin-top:18px;}
  .stamp{width:128px;height:128px;flex-shrink:0;transform:rotate(-7deg);opacity:.95;}
  .bottom{margin-top:auto;background:var(--arctic-night);color:#B8CBD8;font-size:10px;padding:14px 44px;display:flex;justify-content:space-between;align-items:center;}
  .bottom .thanks{font-family:'Fraunces',serif;font-size:13px;color:var(--aurora-green);font-weight:600;}
  @media print{body{background:none}.sheet{margin:0;box-shadow:none;width:210mm;min-height:321mm;zoom:0.92}@page{size:A4;margin:0}}
</style>
</head>
<body>
<div class="sheet">
  <header class="head">
    <div class="head-row">
      <div class="brand-block">
        <img class="logo" src="${INVOICE_LOGO}" alt="${esc(COMPANY.name1)} logo">
        <div>
        <div class="brand-name">${esc(COMPANY.name1)}<br>${esc(COMPANY.name2)} <span>${esc(COMPANY.name3)}</span> ${esc(COMPANY.suffix)}</div>
        <div class="tagline">${esc(COMPANY.tagline)}</div>
        <div class="brand-meta">
          <strong>Business ID:</strong> ${esc(COMPANY.businessId)} &nbsp;·&nbsp; Finland<br>
          ${esc(COMPANY.address)}<br>
          ${esc(COMPANY.email)} &nbsp;·&nbsp; ${esc(COMPANY.phone)} &nbsp;·&nbsp; ${esc(COMPANY.website)}
        </div>
        </div>
      </div>
      <div class="doc-badge">
        <div class="word">INVOICE</div>
        <div class="num">
          Invoice No. <b>${esc(inv.invoice_number)}</b><br>
          Date: ${esc(fmtDate(inv.issue_date))}<br>
          Due Date: ${esc(fmtDate(inv.due_date))}
        </div>
      </div>
    </div>
  </header>

  <section class="parties">
    <div class="party">
      <div class="label">Bill To</div>
      <p class="name">${esc(inv.customer.name)}</p>
      <p>${[inv.customer.country, inv.customer.email, inv.customer.phone].filter(Boolean).map(esc).join("<br>")}</p>
    </div>
    <div class="party">
      <div class="label">Booking Reference</div>
      <div class="kv">
        <b>Booking No.</b> ${esc(bookingRef)}<br>
        <b>Tour / Package</b> ${esc(packageName)}<br>
        <b>Booked Via</b> ${esc(bookedVia)}
      </div>
    </div>
    <div class="party">
      <div class="label">Payment Status</div>
      <div class="kv">
        <b>Currency</b> ${esc(cur)}<br>
        <b>Total Package</b> ${esc(fmtMoney(cur, total))}<br>
        <b>Due Now (20%)</b> ${esc(fmtMoney(cur, dueNow))}
      </div>
    </div>
  </section>

  <section class="trip">
    <div><small>Travel Dates</small><span>${esc(fmtRange(b.start_date, b.end_date))}</span></div>
    <div><small>Destination</small><span>${esc(destination)}</span></div>
    <div><small>Travellers</small><span>${esc(travellers)}</span></div>
    <div><small>Lead Guest</small><span>${esc(inv.customer.name)}</span></div>
  </section>

  <section class="items">
    <table>
      <thead>
        <tr>
          <th style="width:46%">Description</th>
          <th>Dates</th>
          <th class="r" style="text-align:right">Qty / Pax</th>
          <th class="r" style="text-align:right">Unit Price</th>
          <th class="r">Amount (${esc(cur === "EUR" ? "€" : cur)})</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="color:var(--muted)">No line items</td></tr>`}
      </tbody>
    </table>
  </section>

  <div class="totals-wrap">
    <div class="totals">
      <div class="row"><span>Subtotal / Total Package</span><span>${esc(fmtMoney(cur, subtotal))}</span></div>
      ${hasTax ? `<div class="row"><span>Tax (${esc(inv.tax_rate)}%)</span><span>${esc(fmtMoney(cur, inv.tax_amount))}</span></div>` : ""}
      <div class="row"><span>20% Booking Amount Payable Now</span><span>${esc(fmtMoney(cur, dueNow))}</span></div>
      <div class="row"><span>Balance (per payment terms)</span><span>${esc(fmtMoney(cur, total - dueNow))}</span></div>
      <div class="row grand"><span>DUE NOW — Booking Amount (20%)</span><span>${esc(fmtMoney(cur, dueNow))}</span></div>
    </div>
  </div>

  <section class="footer-grid">
    <div class="pay-box">
      <div class="label">Payment Details — Flywire</div>
      <div class="kv">
        <b>Method</b> Flywire (Card / Bank Transfer)<br>
        <b>1 · Booking 20%</b> ${esc(fmtMoney(cur, dueNow))} — ${payA(dueNow)}<br>
        <b>2 · Next 30%</b> ${esc(fmtMoney(cur, next30))} — ${payA(next30)}<br>
        <b>3 · Final 50%</b> ${esc(fmtMoney(cur, final50))} — ${payA(final50)}<br>
        <b>Payable Now</b> <span style="font-weight:700">${esc(fmtMoney(cur, dueNow))} (Booking 20%)</span><br>
        <b>Reference</b> ${esc(inv.invoice_number)}
      </div>
    </div>
    <div class="terms">
      <div class="label">Payment Terms</div>
      <ul>
        <li><b>20% booking amount</b> (${esc(fmtMoney(cur, dueNow))}) is required at the time of booking.</li>
        <li>The <b>next 30%</b> (${esc(fmtMoney(cur, next30))}) must be settled within 20 days of confirmation.</li>
        <li>The <b>remaining 50%</b> (${esc(fmtMoney(cur, final50))}) is due 60 days before the travel start date.</li>
        <li>Prices in ${esc(cur)}. Any payment-processing charges are the responsibility of the payer.</li>
      </ul>
      <div class="stamp-area">
        <svg class="stamp" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Official stamp">
          <defs>
            <path id="ringTop" d="M 100,100 m -82,0 a 82,82 0 1,1 164,0"/>
            <path id="ringBottom" d="M 100,100 m -82,0 a 82,82 0 1,0 164,0"/>
            <clipPath id="coreClip"><circle cx="100" cy="100" r="64"/></clipPath>
          </defs>
          <circle cx="100" cy="100" r="97" fill="none" stroke="#0B1F33" stroke-width="3"/>
          <circle cx="100" cy="100" r="91" fill="none" stroke="#0B1F33" stroke-width="1"/>
          <circle cx="100" cy="100" r="67" fill="none" stroke="#0B1F33" stroke-width="1.5"/>
          <image href="${INVOICE_STAMP_LOGO}" x="36" y="36" width="128" height="128" clip-path="url(#coreClip)"/>
          <text font-family="Inter, sans-serif" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="#0B1F33">
            <textPath href="#ringTop" startOffset="50%" text-anchor="middle">VISIT LAPLAND FINLAND TRAVELS OY</textPath>
          </text>
          <text font-family="Inter, sans-serif" font-size="9.5" font-weight="600" letter-spacing="1.4" fill="#0B1F33">
            <textPath href="#ringBottom" startOffset="50%" text-anchor="middle">BUSINESS ID ${esc(COMPANY.businessId)} · FINLAND</textPath>
          </text>
          <text x="13" y="105" font-size="9" fill="#0B1F33">★</text>
          <text x="180" y="105" font-size="9" fill="#0B1F33">★</text>
        </svg>
      </div>
    </div>
  </section>

  <footer class="bottom">
    <span class="thanks">Kiitos — Thank you for travelling with us!</span>
    <span>${esc(COMPANY.name1)} ${esc(COMPANY.name2)} ${esc(COMPANY.name3)} ${esc(COMPANY.suffix)} · Business ID ${esc(COMPANY.businessId)} · ${esc(COMPANY.address)}</span>
  </footer>
</div>
</body>
</html>`;
}

/**
 * Opens the branded invoice in a hidden iframe and triggers the browser's
 * print dialog (Save as PDF). Falls back to a new tab if the iframe is blocked.
 */
export function downloadInvoicePdf(inv: InvoiceForPdf) {
  const html = renderInvoiceHtml(inv);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: open in a new tab so the user can print manually.
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Give the print dialog time to grab the document before cleanup.
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  // Wait for fonts + the two logo images to load so the PDF isn't blank.
  if (iframe.contentWindow?.document.readyState === "complete") {
    setTimeout(doPrint, 400);
  } else {
    iframe.onload = () => setTimeout(doPrint, 400);
  }
}

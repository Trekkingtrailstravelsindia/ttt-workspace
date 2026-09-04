// Heuristic parser: turn a pasted blob of text into booking fields.
// Everything is best-effort; the UI shows an editable preview before saving.

export type ParsedBooking = {
  customer: string;
  activity: string;
  startDate: string; // YYYY-MM-DD ("" if not found)
  endDate: string;   // YYYY-MM-DD ("" if none)
  time: string;      // HH:MM 24h ("" if none)
  pax: number;
  email: string;
  phone: string;
  source: string;    // lead source guess ("" if none)
  country: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function iso(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

// Find up to two dates in the text (start + optional end for a range).
function findDates(text: string, defaultYear: number): { start: string; end: string } {
  const found: string[] = [];

  // ISO: 2026-12-24
  const isoRe = /(\d{4})-(\d{2})-(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = isoRe.exec(text))) found.push(iso(+m[1], +m[2] - 1, +m[3]));

  // "24 Dec 2026" / "24 December" / "24th Dec"
  const dmyRe = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?/g;
  while ((m = dmyRe.exec(text))) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon === undefined) continue;
    found.push(iso(m[3] ? +m[3] : defaultYear, mon, +m[1]));
  }

  // "Dec 24 2026" / "December 24, 2026"
  const mdyRe = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/g;
  while ((m = mdyRe.exec(text))) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon === undefined) continue;
    found.push(iso(m[3] ? +m[3] : defaultYear, mon, +m[2]));
  }

  // DD/MM/YYYY or DD-MM-YYYY (EU order assumed)
  const numRe = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/g;
  while ((m = numRe.exec(text))) {
    let y = +m[3]; if (y < 100) y += 2000;
    found.push(iso(y, +m[2] - 1, +m[1]));
  }

  // De-dupe, keep order, sort so start <= end.
  const uniq = [...new Set(found)].filter(Boolean).sort();
  return { start: uniq[0] ?? "", end: uniq.length > 1 ? uniq[uniq.length - 1] : "" };
}

function findTime(text: string): string {
  // 18:00 / 6:30 pm
  let m = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m) {
    let h = +m[1]; const min = m[2];
    if (m[3]) { const pm = /pm/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return `${pad(h)}:${min}`;
  }
  // "6 pm" / "6pm"
  m = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (m) {
    let h = +m[1]; const pm = /pm/i.test(m[2]);
    if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0;
    return `${pad(h)}:00`;
  }
  return "";
}

function findPax(text: string): number {
  const m = text.match(/\b(\d{1,3})\s*(?:pax|adults?|people|persons?|guests?|travell?ers?)\b/i);
  return m ? Math.max(1, +m[1]) : 1;
}

// Pull a value after a "Label:" line, if present.
function labelled(text: string, labels: string[]): string {
  for (const l of labels) {
    const re = new RegExp(`${l}\\s*[:\\-]\\s*(.+)`, "i");
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

export function parseBookingText(text: string, knownActivities: string[] = [], defaultYear?: number): ParsedBooking {
  const year = defaultYear ?? new Date().getFullYear();
  const { start, end } = findDates(text, year);
  const time = findTime(text);
  const pax = findPax(text);

  // Activity: explicit label first, then match a known package name, else leftover guess.
  let activity = labelled(text, ["activity", "tour", "package", "trip"]);
  if (!activity) {
    const lower = text.toLowerCase();
    const hit = knownActivities.find(a => a && lower.includes(a.toLowerCase()));
    if (hit) activity = hit;
  }

  // Customer: explicit label, or "for <name>".
  let customer = labelled(text, ["customer", "name", "guest", "client", "pax name"]);
  if (!customer) {
    const m = text.match(/\bfor\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/);
    if (m) customer = m[1].trim();
  }
  // Fallback: first non-empty line that isn't obviously a date/label.
  if (!customer) {
    const firstLine = text.split(/\r?\n/).map(s => s.trim()).find(Boolean) ?? "";
    if (firstLine && !/\d{4}-\d{2}-\d{2}/.test(firstLine) && firstLine.length < 60) customer = firstLine.replace(/[,;].*$/, "").trim();
  }

  // Contact + source extraction.
  const emailM = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const email = emailM ? emailM[0] : "";
  const phoneM = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
  const phone = phoneM ? phoneM[1].replace(/[^\d+]/g, "") : "";

  let source = labelled(text, ["source", "via", "channel"]).toLowerCase();
  if (!source) {
    const lower = text.toLowerCase();
    const guess = ["whatsapp", "instagram", "facebook", "email", "referral", "google", "website", "tiktok"].find(s => lower.includes(s));
    source = guess ?? "";
  }
  const country = labelled(text, ["country", "from", "location"]);

  return { customer, activity, startDate: start, endDate: end, time, pax, email, phone, source, country };
}

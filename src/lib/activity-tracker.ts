// Activity Tracker — a per-guest booking checklist modelled on the operations
// team's "Guest Name / Package" sheet. Each sheet is a flat list of activity
// rows (activity name, dates, time, supplier, booked Yes/No, cost, paid Yes/No)
// that can be auto-filled from an existing Booking Data & Tracker sheet, then
// freely edited and downloaded as a printable PDF.
//
// Storage mirrors booking-tracker-store: the shared Supabase table
// `activity_trackers` when available, otherwise this browser's localStorage.

import { supabase } from "@/integrations/supabase/client";
import type { Tracker } from "./booking-tracker";
import { fmtDate, timeRange, money, uid } from "./booking-tracker";

export { money, fmtDate, uid };

export type ActivityRow = {
  id: string;
  activity: string;   // "Husky Safari", "Hotel in Helsinki", …
  dates: string;      // free text (auto-filled from matched day dates)
  time: string;       // free text ("19:30", "19:30–22:00")
  supplier: string;
  booked: boolean;    // Yes / No
  cost: string;       // kept as free text so "€110" / "₹9,000" / notes all work
  paid: boolean;      // Yes / No
  location: string;   // where it happens — drives the "what to book & where" panel
};

export type ActivitySheet = {
  id: string;
  guest_name: string;
  package_name: string;
  currency: string;
  source_tracker_id?: string | null; // tracker it was auto-filled from
  rows: ActivityRow[];
  notes: string;
  updated_at?: string;
};

// The standard activity checklist the ops team books against, in order.
export const DEFAULT_ACTIVITIES = [
  "Husky Safari",
  "Reindeer Safari",
  "Snowmobiling Safari",
  "Northern Lights Tour",
  "Ruka Coaster Ride",
  "Ice Breaker Cruise",
  "Santa Village",
  "Helsinki Tour",
  "Tallinn Tour",
  "Cruise to Tallinn",
  "Train Tickets",
  "Igloo Stay",
  "Hotel in Helsinki",
  "Hotel in Kuusamo",
  "Hotel in Rovaniemi",
  "Hotel in Oulu",
] as const;

export const newRow = (activity = ""): ActivityRow => ({
  id: uid(), activity, dates: "", time: "", supplier: "", booked: false, cost: "", paid: false, location: "",
});

export const blankSheet = (): ActivitySheet => ({
  id: uid(),
  guest_name: "",
  package_name: "",
  currency: "EUR",
  source_tracker_id: null,
  rows: DEFAULT_ACTIVITIES.map((a) => newRow(a)),
  notes: "",
});

// ---- Auto-fill from a Booking Data & Tracker sheet -------------------------
// Each default activity is matched against the tracker's day line-items by a
// small keyword rule. A predicate returns true when a line-item's service text
// belongs to that activity. Hotels require both "hotel" and the city so e.g.
// "Hotel in Helsinki" never swallows the "Helsinki Tour".
type Pred = (s: string) => boolean;
const has = (...k: string[]): Pred => (s) => k.some((x) => s.includes(x));
const all = (...k: string[]): Pred => (s) => k.every((x) => s.includes(x));

const MATCHERS: Record<string, Pred> = {
  "Husky Safari": has("husky"),
  "Reindeer Safari": has("reindeer"),
  "Snowmobiling Safari": has("snowmob"),
  "Northern Lights Tour": has("northern light", "aurora"),
  "Ruka Coaster Ride": has("coaster"),
  "Ice Breaker Cruise": has("ice breaker", "icebreaker"),
  "Santa Village": has("santa"),
  "Helsinki Tour": (s) => s.includes("helsinki") && has("tour", "city", "guided", "sightsee")(s),
  "Tallinn Tour": (s) => s.includes("tallinn") && has("tour", "city", "old town")(s) && !has("cruise", "ferry")(s),
  "Cruise to Tallinn": (s) => s.includes("tallinn") && has("cruise", "ferry")(s),
  "Train Tickets": has("train", "santa claus express"),
  "Igloo Stay": has("igloo", "glass dome", "aurora cabin"),
  "Hotel in Helsinki": all("hotel", "helsinki"),
  "Hotel in Kuusamo": (s) => s.includes("hotel") && has("kuusamo", "ruka")(s),
  "Hotel in Rovaniemi": all("hotel", "rovaniemi"),
  "Hotel in Oulu": all("hotel", "oulu"),
};

type Hit = { date: string | null; item: Tracker["days"][number]["items"][number]; location: string };

// Build an auto-filled sheet from a tracker. Keeps the standard 16 rows (so the
// checklist is always complete) and appends any booked service that didn't map
// to one of them, so nothing is silently dropped.
export function sheetFromTracker(t: Tracker): ActivitySheet {
  const sheet = blankSheet();
  sheet.id = uid();
  sheet.guest_name = t.customer_name || "";
  sheet.package_name = t.package_name || t.title || "";
  sheet.currency = t.currency || "EUR";
  sheet.source_tracker_id = t.id;

  // Flatten every line item with its day context.
  const hits: Hit[] = [];
  for (const d of t.days || []) {
    for (const it of d.items || []) {
      hits.push({ date: d.date, item: it, location: d.location || "" });
    }
  }
  const used = new Set<Hit>();

  for (const row of sheet.rows) {
    const pred = MATCHERS[row.activity];
    if (!pred) continue;
    const matched = hits.filter((h) => pred(`${h.item.service} ${h.item.details}`.toLowerCase()));
    if (matched.length === 0) continue;
    matched.forEach((m) => used.add(m));

    const dates = Array.from(new Set(matched.map((m) => fmtDate(m.date)).filter((x) => x && x !== "—")));
    const times = Array.from(new Set(matched.map((m) => timeRange(m.item)).filter(Boolean)));
    const suppliers = Array.from(new Set(matched.map((m) => m.item.supplier).filter(Boolean)));
    const locations = Array.from(new Set(matched.map((m) => m.location).filter(Boolean)));
    const total = matched.reduce((s, m) => s + (Number(m.item.price) || 0), 0);

    row.dates = dates.join(", ");
    row.time = times.join(", ");
    row.supplier = suppliers.join(", ");
    row.location = locations.join(", ");
    row.cost = total ? money(total, sheet.currency) : "";
    row.booked = matched.every((m) => m.item.booked);
    row.paid = matched.every((m) => m.item.paid);
  }

  // Any remaining booked/priced service that didn't map to a standard row.
  for (const h of hits) {
    if (used.has(h)) continue;
    const it = h.item;
    if (!it.service) continue;
    if (!it.booked && !it.paid && !(Number(it.price) > 0)) continue;
    const r = newRow(it.service);
    r.dates = h.date ? fmtDate(h.date) : "";
    r.time = timeRange(it);
    r.supplier = it.supplier || "";
    r.location = h.location;
    r.cost = Number(it.price) ? money(Number(it.price), sheet.currency) : "";
    r.booked = !!it.booked;
    r.paid = !!it.paid;
    sheet.rows.push(r);
  }

  return sheet;
}

// Rows still to be booked — powers the "what to book & where" panel.
export const toBook = (s: ActivitySheet) =>
  s.rows.filter((r) => r.activity.trim() && !r.booked);

export const bookedCount = (s: ActivitySheet) =>
  s.rows.filter((r) => r.activity.trim() && r.booked).length;
export const activeCount = (s: ActivitySheet) =>
  s.rows.filter((r) => r.activity.trim()).length;

// ---- Storage (Supabase `activity_trackers`, else localStorage) -------------
const db = supabase as any;
const LS_KEY = "ttt_activity_trackers_v1";
let mode: "supabase" | "local" | null = null;

async function detectMode(): Promise<"supabase" | "local"> {
  if (mode) return mode;
  try {
    const { error } = await db.from("activity_trackers").select("id").limit(1);
    mode = error ? "local" : "supabase";
  } catch {
    mode = "local";
  }
  return mode!;
}
export async function storageMode() { return detectMode(); }

function lsAll(): ActivitySheet[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsWrite(list: ActivitySheet[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function toRow(s: ActivitySheet) {
  return {
    id: s.id,
    guest_name: s.guest_name || null,
    package_name: s.package_name || null,
    currency: s.currency,
    source_tracker_id: s.source_tracker_id || null,
    data: s,
  };
}
function fromRow(r: any): ActivitySheet {
  const d = (r.data || {}) as Partial<ActivitySheet>;
  return {
    id: r.id,
    guest_name: d.guest_name ?? r.guest_name ?? "",
    package_name: d.package_name ?? r.package_name ?? "",
    currency: d.currency ?? r.currency ?? "EUR",
    source_tracker_id: d.source_tracker_id ?? r.source_tracker_id ?? null,
    rows: d.rows ?? [],
    notes: d.notes ?? "",
    updated_at: r.updated_at,
  };
}

export async function listSheets(): Promise<ActivitySheet[]> {
  if ((await detectMode()) === "supabase") {
    const { data, error } = await db.from("activity_trackers").select("*").order("updated_at", { ascending: false });
    if (!error && data) return data.map(fromRow);
    mode = "local";
  }
  return lsAll().sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

export async function saveSheet(s: ActivitySheet): Promise<void> {
  s.updated_at = new Date().toISOString();
  if ((await detectMode()) === "supabase") {
    const { error } = await db.from("activity_trackers").upsert(toRow(s));
    if (!error) return;
    mode = "local";
  }
  const list = lsAll();
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) list[i] = s; else list.unshift(s);
  lsWrite(list);
}

export async function deleteSheet(id: string): Promise<void> {
  if ((await detectMode()) === "supabase") {
    const { error } = await db.from("activity_trackers").delete().eq("id", id);
    if (!error) return;
    mode = "local";
  }
  lsWrite(lsAll().filter((x) => x.id !== id));
}

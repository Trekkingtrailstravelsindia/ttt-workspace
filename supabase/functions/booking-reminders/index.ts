// Supabase Edge Function: booking-reminders  (WhatsApp daily reminder via Meta Cloud API)
// -----------------------------------------------------------------------------
// Sends the owner a WhatsApp reminder for every booking whose start_date falls
// within the next 7 days. Invoked once a day by pg_cron (migration
// 20261017160000_schedule_booking_reminders.sql). Because it runs daily and
// scans the whole 0..7 window, a booking 7 days out is reminded today, then
// again at 6, 5, ... 0 days out — a daily nudge until the tour.
//
// Delivery: Meta WhatsApp Cloud API (official). Mirrors the notify-lead function
// so it reuses the SAME secrets, auth, and bulletproofing — nothing new to set
// up on the Meta side.
//
// Secrets (Supabase → Edge Functions → Secrets) — already set for notify-lead:
//   WA_TOKEN, WA_PHONE_NUMBER_ID, WA_TO,
//   WA_TEMPLATE_NAME(=lead_alert), WA_TEMPLATE_LANG(=en), [WA_TEMPLATE_NO_PARAMS],
//   LEAD_WEBHOOK_SECRET
// Optional overrides (only if you approve a dedicated reminder template):
//   REMINDER_TEMPLATE_NAME, REMINDER_TEMPLATE_LANG
// Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// The reminder reuses the existing approved 5-parameter template (lead_alert)
// so NO new Meta approval is needed. Body params, in order:
//   {{1}} "BOOKING REMINDER"   {{2}} "<n>d to go"   {{3}} customer
//   {{4}} package · date        {{5}} status / phone
// If the primary template send fails, it falls back to "hello_world" so you are
// never left in total silence.
//
// Deploy: supabase functions deploy booking-reminders --no-verify-jwt --project-ref bvcwxwxagnxklrbwlrjo

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 8000;
const FALLBACK_TEMPLATE = "hello_world";
const FALLBACK_LANG = "en_US";

type Booking = {
  id: string;
  start_date: string;
  start_time: string | null;
  status: string | null;
  customers: { name: string | null; phone: string | null } | null;
  tour_packages: { name: string | null } | null;
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

    // Auth: same shared secret the notify-lead pipeline uses.
    const expected = Deno.env.get("LEAD_WEBHOOK_SECRET");
    const got = req.headers.get("x-webhook-secret");
    if (!expected || got !== expected) return new Response("forbidden", { status: 403 });

    const token = Deno.env.get("WA_TOKEN");
    const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");
    const to = (Deno.env.get("WA_TO") ?? "").replace(/[^\d]/g, "");
    if (!token || !phoneId || !to) {
      console.error("booking-reminders: WA_TOKEN / WA_PHONE_NUMBER_ID / WA_TO not set");
      return new Response("not configured", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const in7 = new Date(today.getTime() + 7 * 86_400_000);
    const toISO = (d: Date) => d.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("bookings")
      .select("id,start_date,start_time,status,customers(name,phone),tour_packages(name)")
      .gte("start_date", toISO(today))
      .lte("start_date", toISO(in7))
      .order("start_date", { ascending: true });

    if (error) {
      console.error("booking-reminders: query failed", error.message);
      return new Response("query failed", { status: 200 });
    }

    const bookings = (data ?? []).filter(
      (b: Booking) => (b.status ?? "").toLowerCase() !== "cancelled",
    ) as Booking[];

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
    let sent = 0;

    for (const b of bookings) {
      const left = daysUntil(b.start_date);
      const who = b.customers?.name || "Guest";
      const when = [b.tour_packages?.name || "Tour", b.start_time ? `${b.start_date} ${b.start_time}` : b.start_date]
        .filter(Boolean)
        .join(" · ");
      const tail = [
        b.status ? b.status.toUpperCase() : null,
        b.customers?.phone || null,
      ].filter(Boolean).join(" · ") || "-";

      const primary = buildTemplatePayload(to, ["BOOKING REMINDER", `${left}d to go`, who, when, tail]);
      let result = await sendMeta(url, token, primary);

      if (!result.ok) {
        console.error("booking-reminders: template failed, trying hello_world", result.status, result.body);
        result = await sendMeta(url, token, {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: FALLBACK_TEMPLATE, language: { code: FALLBACK_LANG } },
        });
      }
      if (result.ok) sent++;
      else console.error("booking-reminders: send failed", b.id, result.status, result.body);
    }

    console.log(`booking-reminders: ${sent}/${bookings.length} reminders sent`);
    return new Response(JSON.stringify({ window: 7, matched: bookings.length, sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("booking-reminders error:", e);
    return new Response("error", { status: 200 });
  }
});

function buildTemplatePayload(to: string, params: string[]) {
  const name = Deno.env.get("REMINDER_TEMPLATE_NAME") ?? Deno.env.get("WA_TEMPLATE_NAME") ?? "hello_world";
  const lang = Deno.env.get("REMINDER_TEMPLATE_LANG") ?? Deno.env.get("WA_TEMPLATE_LANG") ?? "en";
  const noParams = (Deno.env.get("WA_TEMPLATE_NO_PARAMS") ?? "") === "1";
  const base: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name, language: { code: lang } } as Record<string, unknown>,
  };
  if (noParams) return base;
  (base.template as Record<string, unknown>).components = [
    { type: "body", parameters: params.map((t) => ({ type: "text", text: sanitize(t) })) },
  ];
  return base;
}

async function sendMeta(
  url: string,
  token: string,
  message: unknown,
): Promise<{ ok: boolean; status: number; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), META_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: ctrl.signal,
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// WhatsApp template params can't contain newlines/tabs or 4+ spaces.
function sanitize(s: string): string {
  return s.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "-";
}

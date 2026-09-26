// Supabase Edge Function: notify-lead  (WhatsApp alert via Meta Cloud API)
// -----------------------------------------------------------------------------
// Fires a WhatsApp message to the owner whenever a new row lands in
// public.website_bookings (the "Website inbox"). Triggered by a Supabase
// Database trigger on INSERT (migration 20260925000000_notify_lead_webhook.sql).
// A weekly pg_cron heartbeat (migration 20260926000000_notify_hardening.sql)
// also calls this with {type:"HEARTBEAT"} as a dead-man's-switch health ping.
//
// Delivery: Meta WhatsApp Cloud API (official). Customer data stays within Meta.
//
// BULLETPROOFING (why this won't silently die):
//   1. Timeout on every Meta call (AbortController) so a hung request can't
//      freeze the function.
//   2. Fallback: if the primary template send fails (e.g. Meta pauses the
//      custom template), we automatically retry with the always-available
//      "hello_world" template, so you still get *a* ping — never total silence.
//   3. Weekly heartbeat: you get a "system healthy" message every Monday. If it
//      ever stops arriving, that's your early warning.
//   4. Every outcome is logged (queryable in the function's Logs tab).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   WA_TOKEN, WA_PHONE_NUMBER_ID, WA_TO, WA_MODE(=template),
//   WA_TEMPLATE_NAME(=lead_alert), WA_TEMPLATE_LANG(=en),
//   [WA_TEMPLATE_NO_PARAMS], LEAD_WEBHOOK_SECRET
//
// Deploy: supabase functions deploy notify-lead --no-verify-jwt --project-ref bvcwxwxagnxklrbwlrjo

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Row = {
  id?: string;
  site?: string;
  kind?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  package_title?: string;
  departure?: string;
  travel_date?: string;
  adults?: number;
  kids?: number;
  amount?: number;
  currency?: string;
  payment_status?: string;
  source?: string;
  notes?: string;
};

const GRAPH_VERSION = "v21.0";
const META_TIMEOUT_MS = 8000;

// Always-approved fallback template (ships with every WhatsApp account).
const FALLBACK_TEMPLATE = "hello_world";
const FALLBACK_LANG = "en_US";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

    // --- Auth: shared secret from the DB trigger / heartbeat cron ------------
    const expected = Deno.env.get("LEAD_WEBHOOK_SECRET");
    const got = req.headers.get("x-webhook-secret");
    if (!expected || got !== expected) {
      return new Response("forbidden", { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const isHeartbeat = payload?.type === "HEARTBEAT";
    const row: Row = payload?.record ?? (isHeartbeat ? {} : payload) ?? {};

    const token = Deno.env.get("WA_TOKEN");
    const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");
    const to = (Deno.env.get("WA_TO") ?? "").replace(/[^\d]/g, "");
    if (!token || !phoneId || !to) {
      console.error("notify-lead: WA_TOKEN / WA_PHONE_NUMBER_ID / WA_TO not set");
      return new Response("not configured", { status: 200 }); // never block the insert
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;

    // --- Primary send --------------------------------------------------------
    const mode = (Deno.env.get("WA_MODE") ?? "template").toLowerCase();
    const primary = isHeartbeat
      ? buildHeartbeatPayload(to)
      : mode === "text"
      ? buildTextPayload(to, row)
      : buildTemplatePayload(to, row);

    let result = await sendMeta(url, token, primary);

    // --- Fallback: primary template failed → try hello_world -----------------
    // Covers the most likely real-world failure: Meta pausing the custom
    // template. A bare "hello_world" still tells you a lead came in.
    if (!result.ok && !isHeartbeat && (primary as Record<string, unknown>).type === "template") {
      console.error(
        "notify-lead: primary template failed, falling back to hello_world",
        result.status,
        result.body,
      );
      const fb = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: FALLBACK_TEMPLATE, language: { code: FALLBACK_LANG } },
      };
      result = await sendMeta(url, token, fb);
      if (result.ok) {
        console.log("notify-lead: delivered via fallback template hello_world");
        return new Response("ok (fallback)", { status: 200 });
      }
    }

    if (!result.ok) {
      console.error("notify-lead: send failed", result.status, result.body);
      return new Response("send failed", { status: 200 }); // never block the insert
    }

    console.log(isHeartbeat ? "notify-lead: heartbeat delivered" : "notify-lead: alert delivered");
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("notify-lead error:", e);
    return new Response("error", { status: 200 }); // never block the DB insert
  }
});

// --- Meta send with timeout ---------------------------------------------------
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

// --- Weekly health ping (dead-man's switch) -----------------------------------
function buildHeartbeatPayload(to: string) {
  const name = Deno.env.get("WA_TEMPLATE_NAME") ?? "hello_world";
  const lang = Deno.env.get("WA_TEMPLATE_LANG") ?? "en";
  const noParams = (Deno.env.get("WA_TEMPLATE_NO_PARAMS") ?? "") === "1";
  const base: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name, language: { code: lang } } as Record<string, unknown>,
  };
  if (noParams) return base;
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  (base.template as Record<string, unknown>).components = [
    {
      type: "body",
      parameters: ["health check", "system", "all systems OK", `weekly check ${now} UTC`, "no action needed"].map(
        (t) => ({ type: "text", text: sanitize(t) }),
      ),
    },
  ];
  return base;
}

// --- Template message (real lead alert) --------------------------------------
function buildTemplatePayload(to: string, row: Row) {
  const name = Deno.env.get("WA_TEMPLATE_NAME") ?? "hello_world";
  const lang = Deno.env.get("WA_TEMPLATE_LANG") ?? "en_US";
  const noParams = (Deno.env.get("WA_TEMPLATE_NO_PARAMS") ?? "") === "1";

  const base = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name, language: { code: lang } } as Record<string, unknown>,
  };
  if (noParams) return base;

  const kind = row.kind === "paid" || row.payment_status === "paid" ? "PAID BOOKING" : "lead";
  const site = row.site || "website";
  const who = row.customer_name || "-";
  const what = [row.package_title, row.travel_date].filter(Boolean).join(" · ") || "-";
  const contact = [row.customer_phone, row.customer_email].filter(Boolean).join(" / ") || "-";

  (base.template as Record<string, unknown>).components = [
    {
      type: "body",
      parameters: [kind, site, who, what, contact].map((t) => ({ type: "text", text: sanitize(String(t)) })),
    },
  ];
  return base;
}

// --- Free-form text (only inside the 24h service window; manual testing) ------
function buildTextPayload(to: string, row: Row) {
  return { messaging_product: "whatsapp", to, type: "text", text: { body: buildReadable(row) } };
}

function buildReadable(r: Row): string {
  const paid = r.kind === "paid" || r.payment_status === "paid";
  const head = paid ? "💰 NEW PAID BOOKING" : "🔔 NEW LEAD";
  const site = r.site ? r.site.toUpperCase() : "WEBSITE";
  const pax = [r.adults ? `${r.adults} ad` : null, r.kids ? `${r.kids} ch` : null].filter(Boolean).join(" · ");
  const money =
    r.amount != null && r.amount !== 0 ? `${r.currency ?? "EUR"} ${Number(r.amount).toLocaleString()}` : null;
  return [
    `${head} · ${site}`,
    r.customer_name ? `👤 ${r.customer_name}` : null,
    r.package_title ? `🏔️ ${r.package_title}` : null,
    [r.departure, r.travel_date].filter(Boolean).join(" · ") || null,
    pax || null,
    money ? `💶 ${money}` : null,
    r.customer_phone ? `📞 ${r.customer_phone}` : null,
    r.customer_email ? `📧 ${r.customer_email}` : null,
    r.notes ? `📝 ${r.notes.slice(0, 200)}` : null,
    "",
    "→ Open the Website inbox in the CRM to triage.",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");
}

// WhatsApp template params can't contain newlines/tabs or 4+ spaces.
function sanitize(s: string): string {
  return s.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "-";
}

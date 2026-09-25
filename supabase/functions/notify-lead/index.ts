// Supabase Edge Function: notify-lead  (WhatsApp alert via Meta Cloud API)
// -----------------------------------------------------------------------------
// Fires a WhatsApp message to the owner whenever a new row lands in
// public.website_bookings (the "Website inbox"). Triggered by a Supabase
// Database Webhook / trigger on INSERT (migration
// 20260925000000_notify_lead_webhook.sql).
//
// Delivery: Meta WhatsApp Cloud API (official). Customer data stays within Meta.
//
//   POST https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages
//   Authorization: Bearer <ACCESS_TOKEN>
//
// Automated (outside the 24h customer-service window) messages MUST use an
// APPROVED template. We therefore send a template by default. Two modes:
//
//   WA_MODE = "template" (default)
//     Uses WA_TEMPLATE_NAME with body variables filled from the lead row.
//     For a first live test you can point WA_TEMPLATE_NAME at Meta's
//     pre-approved "hello_world" template (no variables) — set
//     WA_TEMPLATE_NO_PARAMS=1 so we send it with no body parameters.
//
//   WA_MODE = "text"
//     Free-form text. ONLY delivers if the recipient messaged your business
//     number within the last 24h. Handy for quick manual testing.
//
// DEPLOY / ENABLE:
//   1. supabase secrets set \
//        WA_TOKEN=<permanent-or-temp-access-token> \
//        WA_PHONE_NUMBER_ID=<phone number ID from Meta> \
//        WA_TO=<your number, digits only, e.g. 9199XXXXXXXX> \
//        WA_TEMPLATE_NAME=lead_alert \
//        WA_TEMPLATE_LANG=en \
//        LEAD_WEBHOOK_SECRET=<any-long-random-string>
//   2. supabase functions deploy notify-lead --no-verify-jwt
//
// Security: the DB trigger sends header  x-webhook-secret: <LEAD_WEBHOOK_SECRET>.
// We reject anything without the matching secret so the public URL can't be
// abused to spam your WhatsApp.

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

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

    // --- Auth: shared secret from the DB trigger -----------------------------
    const expected = Deno.env.get("LEAD_WEBHOOK_SECRET");
    const got = req.headers.get("x-webhook-secret");
    if (!expected || got !== expected) {
      return new Response("forbidden", { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const row: Row = payload?.record ?? payload ?? {};

    const token = Deno.env.get("WA_TOKEN");
    const phoneId = Deno.env.get("WA_PHONE_NUMBER_ID");
    const to = (Deno.env.get("WA_TO") ?? "").replace(/[^\d]/g, "");
    if (!token || !phoneId || !to) {
      console.error("notify-lead: WA_TOKEN / WA_PHONE_NUMBER_ID / WA_TO not set");
      return new Response("not configured", { status: 200 }); // don't fail the insert
    }

    const mode = (Deno.env.get("WA_MODE") ?? "template").toLowerCase();
    const message =
      mode === "text"
        ? buildTextPayload(to, row)
        : buildTemplatePayload(to, row);

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("notify-lead: Meta API error", res.status, body);
      return new Response("send failed", { status: 200 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("notify-lead error:", e);
    return new Response("error", { status: 200 }); // never block the DB insert
  }
});

// --- Template message (works for automated alerts once template is approved) --
function buildTemplatePayload(to: string, row: Row) {
  const name = Deno.env.get("WA_TEMPLATE_NAME") ?? "hello_world";
  const lang = Deno.env.get("WA_TEMPLATE_LANG") ?? "en_US";
  const noParams = (Deno.env.get("WA_TEMPLATE_NO_PARAMS") ?? "") === "1";

  const base = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name,
      language: { code: lang },
    } as Record<string, unknown>,
  };

  // hello_world (and any zero-variable template) → no components.
  if (noParams) return base;

  // Custom template "lead_alert" with 5 body variables {{1}}..{{5}}.
  // Suggested template body (submit this for approval in Meta):
  //   "New {{1}} from {{2}}: {{3}} — {{4}}. Contact: {{5}}. Open the CRM inbox to triage."
  const kind = row.kind === "paid" || row.payment_status === "paid" ? "PAID BOOKING" : "lead";
  const site = row.site ? row.site : "website";
  const who = row.customer_name || "—";
  const what = [row.package_title, row.travel_date].filter(Boolean).join(" · ") || "—";
  const contact = [row.customer_phone, row.customer_email].filter(Boolean).join(" / ") || "—";

  (base.template as Record<string, unknown>).components = [
    {
      type: "body",
      parameters: [kind, site, who, what, contact].map((t) => ({
        type: "text",
        text: sanitize(String(t)),
      })),
    },
  ];
  return base;
}

// --- Free-form text (only inside the 24h service window; for manual testing) --
function buildTextPayload(to: string, row: Row) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: buildReadable(row) },
  };
}

function buildReadable(r: Row): string {
  const paid = r.kind === "paid" || r.payment_status === "paid";
  const head = paid ? "💰 NEW PAID BOOKING" : "🔔 NEW LEAD";
  const site = r.site ? r.site.toUpperCase() : "WEBSITE";
  const pax = [r.adults ? `${r.adults} ad` : null, r.kids ? `${r.kids} ch` : null]
    .filter(Boolean)
    .join(" · ");
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
  return s.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "—";
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH_VERSION = "v20.0";

function creds() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in the server environment."
    );
  }
  return { token, phoneNumberId };
}

async function postMessage(body: Record<string, unknown>) {
  const { token, phoneNumberId } = creds();
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    }
  );
  const json = (await res.json()) as any;
  if (!res.ok) {
    const msg = json?.error?.message || `WhatsApp API error (${res.status})`;
    throw new Error(msg);
  }
  return { id: json?.messages?.[0]?.id ?? null };
}

// Send a free-form text message. Only delivers inside the 24h customer-initiated
// window; for the first/outbound message to a new lead use a template instead.
export const sendWhatsAppText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ to: z.string().min(6), body: z.string().min(1).max(4096) }).parse(data)
  )
  .handler(async ({ data }) => {
    const to = data.to.replace(/\D/g, "");
    return postMessage({
      to,
      type: "text",
      text: { preview_url: true, body: data.body },
    });
  });

// Send an approved template message (works for the first outbound contact).
// Defaults to the "hello_world" template that every WhatsApp account ships with.
export const sendWhatsAppTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        to: z.string().min(6),
        template: z.string().min(1).default("hello_world"),
        lang: z.string().min(2).default("en_US"),
        bodyParams: z.array(z.string()).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const to = data.to.replace(/\D/g, "");
    const components = data.bodyParams?.length
      ? [
          {
            type: "body",
            parameters: data.bodyParams.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;
    return postMessage({
      to,
      type: "template",
      template: {
        name: data.template,
        language: { code: data.lang },
        ...(components ? { components } : {}),
      },
    });
  });

// Lightweight config probe so the UI can show whether API sending is available.
export const whatsappConfigured = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      configured: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    };
  });

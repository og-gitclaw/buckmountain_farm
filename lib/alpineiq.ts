/**
 * Alpine IQ thin client.
 *
 * Why this exists:
 *   - Brendon's directive: keep AWS SES TRANSACTIONAL ONLY (order confirms,
 *     password resets, etc). All marketing — SMS, push, MMS, drip flows —
 *     goes through Alpine IQ which already has cannabis-compliant audience
 *     handling, age gates, and STOP/HELP keyword automation.
 *   - Piggyback the existing OG Life Alpine IQ org since the configuration
 *     "is similar enough." Same UID space, same compliance settings.
 *
 * API:
 *   - Base: ALPINEIQ_API_BASE_URL (default https://lab.alpineiq.com/api/v1.1)
 *   - Auth: Bearer ALPINEIQ_API_KEY + uid header ALPINEIQ_UID
 *   - Docs: https://docs.alpineiq.com/ (login-walled)
 *
 * Scope of this client (P3 minimum):
 *   - upsertContact: add/update a contact with phone + email + tags
 *   - sendSms: trigger a one-off SMS (used by /api/sms/subscribe welcome)
 *   - broadcastNewProduct: trigger an audience-scoped campaign (used by
 *     /api/notifications/new-product when a new SKU drops)
 *
 * Everything is fail-open: if the API key isn't set, we log + return a
 * structured "skipped" result so callers don't 500 in preview/dev.
 */

type AlpineResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }
  | { ok: false; skipped: true; reason: string };

const BASE = () =>
  process.env.ALPINEIQ_API_BASE_URL ?? "https://lab.alpineiq.com/api/v1.1";
const KEY = () => process.env.ALPINEIQ_API_KEY ?? "";
const UID = () => process.env.ALPINEIQ_UID ?? "";

function configured(): boolean {
  return Boolean(KEY() && UID());
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<AlpineResult<T>> {
  if (!configured()) {
    return { ok: false, skipped: true, reason: "alpineiq-not-configured" };
  }
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY()}`,
      uid: UID(),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: txt };
  }
  return { ok: true, data: (await res.json()) as T };
}

export type AlpineContactInput = {
  email?: string;
  phone?: string;          // E.164, e.g. +14155551234
  first_name?: string;
  last_name?: string;
  tags?: string[];         // e.g. ["buckmountain", "21+", "new-drop-optin"]
  consents?: Record<string, boolean>;
};

export function upsertContact(input: AlpineContactInput) {
  return call<{ id: string }>("/contacts/upsert", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function sendSms(opts: { to: string; body: string; campaign?: string }) {
  return call<{ message_id: string }>("/messages/sms", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export function broadcastNewProduct(opts: {
  audience_id: string;
  product_slug: string;
  headline: string;
  body: string;
  cta_url: string;
}) {
  return call<{ campaign_id: string; queued: number }>("/campaigns/broadcast", {
    method: "POST",
    body: JSON.stringify({
      audience_id: opts.audience_id,
      template: "new-product-drop",
      vars: {
        product_slug: opts.product_slug,
        headline: opts.headline,
        body: opts.body,
        cta_url: opts.cta_url,
      },
    }),
  });
}

export const alpineiq = { upsertContact, sendSms, broadcastNewProduct, configured };

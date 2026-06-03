/**
 * Web Push (VAPID) — server-side fan-out helper.
 *
 * Pulls active subscriptions and signs+sends a payload to each.
 * Fail-open: if VAPID env vars are missing, returns { skipped }
 * without throwing so callers can render preview deploys cleanly.
 *
 * 410/404 responses from the push service mean the subscription is
 * dead — we mark it inactive so the next fan-out skips it.
 *
 * Transient failures (429 rate-limit, 5xx push-service hiccups, or a
 * network error with no status) are retried with bounded exponential
 * backoff, honoring a `Retry-After` header when the service sends one.
 * Permanent failures (404/410, malformed sub) are never retried.
 */

import webpush, { type PushSubscription } from "web-push";
import { dbConfigured, getSql } from "@/lib/db";

type Payload = {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
};

// Status codes worth retrying. 0 = the request never got a response
// (DNS/TLS/socket error) — also transient. 404/410 are deliberately
// excluded: they mean the subscription is gone, so retrying is pointless.
const TRANSIENT_STATUS = new Set([0, 429, 500, 502, 503, 504]);
const MAX_DELIVERY_RETRIES = 2;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Prefer the service's Retry-After (seconds) when present, capped so one
// throttled endpoint can't stall the whole fan-out. Otherwise exponential
// backoff: 500ms, 1s, 2s…
function retryDelayMs(attempt: number, retryAfter?: string): number {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, 10_000);
  }
  return Math.min(500 * 2 ** attempt, 4_000);
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const subject = process.env.PUSH_VAPID_SUBJECT;
  const pub = process.env.PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.PUSH_VAPID_PRIVATE_KEY;
  if (!subject || !pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export async function sendToOne(sub: PushSubscription, payload: Payload) {
  if (!ensureConfigured()) {
    return { ok: false as const, skipped: true, reason: "vapid-not-configured" };
  }
  const injected = await consumePushFault();
  if (injected) {
    return {
      ok: false as const,
      statusCode: injected.statusCode,
      message: "fault-injected",
      retryAfter: injected.retryAfter,
    };
  }
  try {
    const res = await webpush.sendNotification(sub, JSON.stringify(payload));
    return { ok: true as const, statusCode: res.statusCode };
  } catch (err) {
    const e = err as {
      statusCode?: number;
      message?: string;
      headers?: Record<string, string>;
    };
    return {
      ok: false as const,
      statusCode: e.statusCode ?? 0,
      message: e.message ?? "send-failed",
      retryAfter: e.headers?.["retry-after"],
    };
  }
}

/**
 * If super-admin fault injection is armed, atomically decrement the
 * remaining counter and return the synthetic error to inject. Otherwise
 * returns null. Auto-disables when remaining reaches 0. DB errors are
 * swallowed (no fault injected) so this can never break a real send.
 */
async function consumePushFault(): Promise<
  { statusCode: number; retryAfter?: string } | null
> {
  if (!dbConfigured()) return null;
  try {
    const sql = getSql();
    const rows = (await sql`
      UPDATE push_fault_injection
         SET remaining = remaining - 1,
             enabled   = (remaining - 1 > 0),
             updated_at = now()
       WHERE id = 1 AND enabled = true AND remaining > 0
       RETURNING status_code, retry_after_seconds
    `) as { status_code: number; retry_after_seconds: number | null }[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      statusCode: r.status_code,
      retryAfter:
        r.retry_after_seconds != null ? String(r.retry_after_seconds) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * sendToOne + bounded retry on transient failures. Returns the final
 * attempt's result plus how many attempts it took.
 */
export async function sendWithRetry(
  sub: PushSubscription,
  payload: Payload,
  maxRetries = MAX_DELIVERY_RETRIES,
) {
  let attempt = 0;
  for (;;) {
    const r = await sendToOne(sub, payload);
    if (r.ok || "skipped" in r) return { ...r, attempts: attempt + 1 };
    const transient = TRANSIENT_STATUS.has(r.statusCode);
    if (!transient || attempt >= maxRetries) return { ...r, attempts: attempt + 1 };
    await delay(retryDelayMs(attempt, r.retryAfter));
    attempt++;
  }
}

export async function broadcast(payload: Payload) {
  if (!ensureConfigured()) {
    return { ok: false as const, skipped: true, reason: "vapid-not-configured", sent: 0 };
  }
  if (!dbConfigured()) {
    return { ok: false as const, skipped: true, reason: "db-not-configured", sent: 0 };
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
     WHERE is_active = true
  `) as { id: number; endpoint: string; p256dh: string; auth: string }[];

  let sent = 0;
  let failed = 0;
  let retries = 0;
  // Mark these as inactive after the loop so we batch the UPDATE.
  const deadIds: number[] = [];

  for (const row of rows) {
    const sub: PushSubscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    const r = await sendWithRetry(sub, payload);
    retries += r.attempts - 1;
    if (r.ok) {
      sent++;
    } else {
      failed++;
      // 404 = endpoint gone, 410 = subscription expired. Either way, retire.
      if ("statusCode" in r && (r.statusCode === 404 || r.statusCode === 410)) {
        deadIds.push(row.id);
      }
    }
  }

  if (deadIds.length > 0) {
    try {
      await sql`UPDATE push_subscriptions SET is_active = false WHERE id = ANY(${deadIds})`;
    } catch {
      /* non-fatal */
    }
  }

  return { ok: true as const, sent, failed, retries, retired: deadIds.length };
}

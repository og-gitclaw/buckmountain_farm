/**
 * POST /api/alpineiq/webhook
 *
 * Alpine IQ events for SMS lifecycle: STOP / HELP / confirm-reply,
 * delivery receipts, etc. We mirror the state into sms_subscriptions
 * so the agent dashboard sees who's confirmed vs. opted out without
 * having to ping Alpine IQ on every read.
 *
 * Verification: Alpine IQ signs requests with HMAC-SHA256 over the body
 * using ALPINEIQ_WEBHOOK_SECRET (see provider docs for header name —
 * default expectation is `x-alpineiq-signature`).
 *
 * Expected event shapes (mapped):
 *   - "contact.optin"     -> sms_subscriptions.status = 'confirmed'
 *   - "contact.optout"    -> sms_subscriptions.status = 'stopped'
 *   - "message.delivered" -> log only (P3 metric)
 *   - "message.failed"    -> log only
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.ALPINEIQ_WEBHOOK_SECRET;
  if (!secret) return false;          // Misconfigured = reject (defaults-deny).
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-alpineiq-signature");

  // In dev/preview without the secret set, we accept anything but log
  // a loud warning. In prod, missing secret means reject.
  const verified = verifySignature(raw, sig);
  if (!verified && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "signature-mismatch" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const type = String(event.type ?? "");
  const phone = String(((event.contact ?? {}) as Record<string, unknown>).phone ?? "");

  // TODO(P3) SQL by event type:
  //   confirmed: UPDATE sms_subscriptions SET status='confirmed', double_optin_at=now() WHERE phone_e164=$1;
  //   stopped:   UPDATE sms_subscriptions SET status='stopped',  stopped_at=now()       WHERE phone_e164=$1;
  console.log("[alpineiq:webhook]", { type, phone, verified });

  return NextResponse.json({ ok: true });
}

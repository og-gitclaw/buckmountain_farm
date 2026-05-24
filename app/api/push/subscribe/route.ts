/**
 * POST /api/push/subscribe
 *
 * Records a Web Push (VAPID) subscription so we can fire browser
 * push notifications when:
 *   - New product drops (matches user's interest tags)
 *   - Monthly prize drawing winners
 *   - QR scan confirmed + points awarded
 *   - Order shipped (transactional → also gets a SES email)
 *
 * Body shape (from PushSubscription.toJSON()):
 *   {
 *     endpoint: "https://fcm.googleapis.com/...",
 *     keys: { p256dh: "...", auth: "..." }
 *   }
 *
 * Returns the public VAPID key on GET so the client can subscribe
 * without the server needing to ship it twice.
 *
 * VAPID keys live in env: PUSH_VAPID_PUBLIC_KEY + PUSH_VAPID_PRIVATE_KEY
 * (generate via `npx web-push generate-vapid-keys`). The private key
 * is what we use server-side to sign push payloads.
 *
 * Web Push gives us in-browser delivery WITHOUT touching Apple/Google
 * developer accounts or Alpine IQ — pure standards. SMS still goes
 * through Alpine IQ; this is the lighter, opt-in browser channel.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function GET() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY ?? null;
  if (!publicKey) {
    return NextResponse.json(
      { error: "vapid-not-configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ vapid_public_key: publicKey });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  const s = body as Subscription | null;
  if (
    !s ||
    typeof s.endpoint !== "string" ||
    !s.endpoint.startsWith("https://") ||
    typeof s.keys?.p256dh !== "string" ||
    typeof s.keys?.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "invalid-subscription-shape" },
      { status: 422 },
    );
  }

  // TODO(P3): upsert into push_subscriptions by endpoint hash.
  console.log("[push:subscribe]", {
    endpoint_host: new URL(s.endpoint).host,
    p256dh_len: s.keys.p256dh.length,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

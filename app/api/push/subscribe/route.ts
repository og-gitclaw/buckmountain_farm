/**
 * GET  /api/push/subscribe  → returns VAPID public key (client uses it
 *                              to subscribe via PushManager).
 * POST /api/push/subscribe  → stores a PushSubscription on
 *                              push_subscriptions (upsert by endpoint
 *                              hash; SHA-256 of the endpoint URL).
 *
 * The push_subscriptions table is what lib/push.broadcast() iterates
 * when /api/notifications/new-product fires.
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";

type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function GET() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY ?? null;
  if (!publicKey) {
    return NextResponse.json({ error: "vapid-not-configured" }, { status: 503 });
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
    return NextResponse.json({ error: "invalid-subscription-shape" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.json({ ok: true, stub: "db-not-configured" }, { status: 202 });
  }

  const endpoint_hash = createHash("sha256").update(s.endpoint).digest("hex");
  const ua = req.headers.get("user-agent") ?? null;
  const sql = getSql();

  const session = await getSession();
  let optin_id: number | null = null;
  if (session) {
    const rows = (await sql`
      INSERT INTO oglife_optins (oglife_user_id, email)
      VALUES (${session.sub}, ${session.email})
      ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `) as { id: number }[];
    optin_id = rows[0].id;
  }

  try {
    await sql`
      INSERT INTO push_subscriptions
        (optin_id, endpoint_hash, endpoint, p256dh, auth, user_agent, is_active, last_seen_at)
      VALUES
        (${optin_id}, ${endpoint_hash}, ${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth}, ${ua}, true, now())
      ON CONFLICT (endpoint_hash) DO UPDATE SET
        p256dh       = EXCLUDED.p256dh,
        auth         = EXCLUDED.auth,
        is_active    = true,
        last_seen_at = now(),
        optin_id     = COALESCE(EXCLUDED.optin_id, push_subscriptions.optin_id)
    `;
  } catch (err) {
    const detail = err instanceof Error ? err.message : "save-failed";
    return NextResponse.json({ error: "save-failed", detail }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

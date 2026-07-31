import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepBilling } from "@/lib/billing/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily billing sweep (Vercel Cron — see vercel.json). Ends trials, charges
 * renewals, retries declines. Safe to call as often as you like: the day's
 * idempotency key means a repeat run charges nothing twice.
 *
 * Vercel Cron presents `Authorization: Bearer $CRON_SECRET` automatically.
 *
 * NOTE the deliberate difference from /api/cron/nabis-sync, which fails OPEN
 * when CRON_SECRET is unset (an unauthenticated caller can trigger an email
 * sync — annoying, not dangerous). This endpoint moves money, so it fails
 * CLOSED: no secret configured means nobody gets in, and the comparison is
 * timing-safe.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepBilling();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[billing] sweep aborted:", err);
    return NextResponse.json({ ok: false, error: "sweep failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only billing ledger for the zsty.us master billing panel: every charge
 * ATTEMPT (paid, declined, in flight) plus the subscription's lane state, so
 * the portfolio overview can show what happened and why without a database
 * hop across projects.
 *
 * Auth: Bearer BILLING_LEDGER_SECRET — its own secret, deliberately not
 * CRON_SECRET (reading a ledger must never be the same capability as running
 * a sweep). Unset means the endpoint doesn't exist.
 */

type Raw = Record<string, unknown>;

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.BILLING_LEDGER_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const presented = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!dbConfigured()) return NextResponse.json({ error: "no database" }, { status: 503 });

  const sql = getSql();
  const subs = (await sql`SELECT * FROM subscriptions`) as Raw[];
  const out = [];
  for (const sub of subs) {
    const charges = (await sql`
      SELECT * FROM billing_charges
       WHERE subscription_id = ${String(sub.id)}
       ORDER BY created_at DESC
       LIMIT 100
    `) as Raw[];
    out.push({
      subscriptionId: sub.id,
      orgName: sub.org_name,
      status: sub.status,
      cardOnFile: sub.card_on_file === true,
      cardLast4: sub.card_last4 ?? null,
      lastChargeStatus: sub.last_charge_status ?? null,
      lastDeclineKind: sub.last_decline_kind ?? null,
      retryCount: sub.retry_count ?? 0,
      nextRetryAt: sub.next_retry_at ?? null,
      nextChargeAt: sub.next_charge_at ?? null,
      dunningStep: sub.dunning_step ?? 0,
      attempts: charges.map((c) => ({
        at: c.created_at,
        amountCents: c.amount_cents,
        ok: c.ok === true,
        reason: c.reason ?? null,
        trigger: c.trigger ?? null,
        cloverChargeId: c.clover_charge_id ?? null,
        idempotencyKey: c.idempotency_key ?? null,
      })),
    });
  }

  return NextResponse.json({
    site: "buckmountain",
    generatedAt: new Date().toISOString(),
    subscriptions: out,
  });
}

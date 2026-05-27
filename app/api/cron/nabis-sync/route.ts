/**
 * GET /api/cron/nabis-sync
 *
 * Pulls recent Nabis orders, diffs against order_status_seen, fires the
 * appropriate transactional email on each status transition:
 *
 *   placed        → order-placed
 *   accepted      → (silent; the placed email covered it)
 *   shipped       → order-shipped (with tracking)
 *   delivered     → order-delivered
 *   canceled      → order-canceled
 *
 * Plus a separate review-request fire 3 days after delivered.
 *
 * Cron: configure in vercel.json (recommended hourly). Auth: Bearer
 * CRON_SECRET (Vercel adds this header to scheduled invocations).
 *
 * Fail-open: if NABIS_API_KEY isn't set, returns { skipped: true }.
 */

import { NextResponse } from "next/server";
import { nabis, type NabisOrder } from "@/lib/nabis";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

const STATUS_TEMPLATE: Record<
  string,
  "order-placed" | "order-shipped" | "order-delivered" | "order-canceled" | null
> = {
  placed: "order-placed",
  pending: "order-placed",
  shipped: "order-shipped",
  in_transit: "order-shipped",
  delivered: "order-delivered",
  canceled: "order-canceled",
  cancelled: "order-canceled",
};

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await nabis.listOrders({
    since: new Date(Date.now() - 14 * 86400_000).toISOString(),
    limit: 200,
  });
  if (!result.ok) {
    if ("skipped" in result) {
      return NextResponse.json({ ok: false, skipped: true, reason: result.reason });
    }
    return NextResponse.json(
      { ok: false, status: result.status, error: result.error },
      { status: 502 },
    );
  }
  const orders: NabisOrder[] = result.data.data ?? [];

  if (!dbConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "db-not-configured", orders: orders.length });
  }
  const sql = getSql();

  let sent = 0;
  for (const order of orders) {
    const seenRows = (await sql`
      SELECT last_status FROM order_status_seen WHERE nabis_order_id = ${order.id}
    `) as { last_status: string }[];
    const prevStatus = seenRows[0]?.last_status ?? null;
    const newStatus = order.status?.toLowerCase() ?? "";

    if (prevStatus === newStatus) continue;

    // Upsert tracking row.
    await sql`
      INSERT INTO order_status_seen
        (nabis_order_id, order_number, last_status, buyer_email, buyer_name)
      VALUES
        (${order.id}, ${order.number}, ${newStatus}, ${
          // Order shape from Nabis may include buyer.email — type loosely.
          (order as unknown as { buyer?: { email?: string } }).buyer?.email ?? null
        }, ${order.buyer?.name ?? null})
      ON CONFLICT (nabis_order_id) DO UPDATE SET
        last_status   = EXCLUDED.last_status,
        last_seen_at  = now(),
        order_number  = EXCLUDED.order_number
    `;

    const template = STATUS_TEMPLATE[newStatus];
    const buyerEmail =
      (order as unknown as { buyer?: { email?: string } }).buyer?.email;
    if (!template || !buyerEmail) continue;

    if (template === "order-placed") {
      await sendTransactional({
        template,
        to: buyerEmail,
        vars: {
          recipient_name: order.buyer?.name,
          order_number: order.number,
          order_total: order.total != null ? `$${order.total}` : null,
          status_url: `https://buckmountain.farm/loyalty/account`,
        },
        related: { kind: "nabis-order", id: order.id },
      });
      sent++;
    } else if (template === "order-shipped") {
      await sendTransactional({
        template,
        to: buyerEmail,
        vars: {
          recipient_name: order.buyer?.name,
          order_number: order.number,
          carrier: null,
          tracking_number: null,
          tracking_url: null,
          eta: null,
        },
        related: { kind: "nabis-order", id: order.id },
      });
      sent++;
    } else if (template === "order-delivered") {
      await sendTransactional({
        template,
        to: buyerEmail,
        vars: {
          recipient_name: order.buyer?.name,
          order_number: order.number,
          review_url: `https://buckmountain.farm/loyalty/account?review=${encodeURIComponent(order.id)}`,
        },
        related: { kind: "nabis-order", id: order.id },
      });
      sent++;
    } else if (template === "order-canceled") {
      await sendTransactional({
        template,
        to: buyerEmail,
        vars: {
          recipient_name: order.buyer?.name,
          order_number: order.number,
          reason: null,
        },
        related: { kind: "nabis-order", id: order.id },
      });
      sent++;
    }
  }

  // Review-request: fire 3 days after delivered. Idempotent via the
  // related_kind='review-request' check in emails_outbound.
  const due = (await sql`
    SELECT s.nabis_order_id, s.order_number, s.buyer_email, s.buyer_name
      FROM order_status_seen s
     WHERE s.last_status = 'delivered'
       AND s.last_seen_at < now() - interval '3 days'
       AND s.buyer_email IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM emails_outbound e
          WHERE e.related_kind = 'review-request'
            AND e.related_id = s.nabis_order_id
       )
     LIMIT 50
  `) as { nabis_order_id: string; order_number: string; buyer_email: string; buyer_name: string | null }[];

  for (const r of due) {
    await sendTransactional({
      template: "review-request",
      to: r.buyer_email,
      vars: {
        recipient_name: r.buyer_name ?? undefined,
        order_number: r.order_number,
        review_url: `https://buckmountain.farm/loyalty/account?review=${encodeURIComponent(r.nabis_order_id)}`,
      },
      related: { kind: "review-request", id: r.nabis_order_id },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, orders: orders.length, emails_sent: sent });
}

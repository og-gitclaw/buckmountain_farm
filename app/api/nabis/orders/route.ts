/**
 * GET /api/nabis/orders
 *
 * Proxies Nabis /orders for the agent + admin dashboards. Caches the
 * response into nabis_sync (P3).
 *
 * Query:
 *   - since=ISO8601 (default: 30d ago)
 *   - dispensary=<id> (filter)
 *   - limit=<n> (default 50)
 *
 * Auth: session cookie (P3) — for now, Bearer ADMIN_API_TOKEN to keep
 * the endpoint useful during dev / Vercel auth wall era.
 */

import { NextResponse } from "next/server";
import { nabis } from "@/lib/nabis";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (expected && req.headers.get("authorization") !== `Bearer ${expected}`) {
    // TODO(P3): swap to session check.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const since =
    url.searchParams.get("since") ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const result = await nabis.listOrders({ since, limit });
  if (result.ok) {
    return NextResponse.json({ ok: true, orders: result.data.data });
  }
  if ("skipped" in result) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: result.reason, orders: [] },
      { status: 200 },
    );
  }
  return NextResponse.json(
    { ok: false, error: result.error, status: result.status },
    { status: 502 },
  );
}

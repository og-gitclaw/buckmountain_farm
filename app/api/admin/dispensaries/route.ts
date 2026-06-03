/**
 * GET /api/admin/dispensaries?status=active,lapsed
 *
 * Authed read of dispensaries for off-platform jobs (the menu-placement
 * scraper on openclaw needs the menu URLs). Bearer ADMIN_API_TOKEN.
 *
 * Returns only the columns a scraper needs — not buyer contact PII.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["lead", "active", "lapsed", "dropped"]);

export async function GET(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "server-misconfigured", detail: "ADMIN_API_TOKEN not set" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statuses = (url.searchParams.get("status") ?? "active,lapsed")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => VALID_STATUS.has(s));
  const filter = statuses.length > 0 ? statuses : ["active", "lapsed"];

  if (!dbConfigured()) {
    return NextResponse.json({ dispensaries: [], stub: "db-not-configured" });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, name, city, state, status, weedmaps_url, leafly_url, menu_url
        FROM dispensaries
       WHERE status = ANY(${filter})
       ORDER BY name
       LIMIT 500
    `;
    return NextResponse.json({ dispensaries: rows });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "query-failed";
    return NextResponse.json({ error: "query-failed", detail }, { status: 500 });
  }
}

/**
 * POST /api/agent/menu-placement
 *
 * Ingest endpoint for the menu-placement scraper (scripts/audit-menu-placement.mjs,
 * runs on openclaw where headless Chromium is viable — not in this runtime).
 * Bearer-authed with ADMIN_ASSET_INGEST_TOKEN, same as the QR-sheet watcher.
 *
 * Body (schema buckmountain-farm/menu-placement/v1):
 *   { schema, results: [
 *       { dispensary_id, platform: 'weedmaps'|'leafly'|'house',
 *         menu_url?, listed, match_count?, matched_names?, error? }
 *   ] }
 *
 * Upserts one menu_listings row per (dispensary_id, platform). Unknown
 * dispensary_ids are skipped (FK would reject) and reported back so the
 * scraper can flag stale slugs.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getPool } from "@/lib/db";

export const runtime = "nodejs";

type Result = {
  dispensary_id: string;
  platform: "weedmaps" | "leafly" | "house";
  menu_url?: string | null;
  listed: boolean;
  match_count?: number;
  matched_names?: string[];
  error?: string | null;
};
type Body = { schema: string; results: Result[] };

const PLATFORMS = new Set(["weedmaps", "leafly", "house"]);

function isValid(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  if (b.schema !== "buckmountain-farm/menu-placement/v1") return false;
  if (!Array.isArray(b.results)) return false;
  return b.results.every((r) => {
    if (!r || typeof r !== "object") return false;
    const o = r as Record<string, unknown>;
    return (
      typeof o.dispensary_id === "string" &&
      o.dispensary_id.length > 0 &&
      typeof o.platform === "string" &&
      PLATFORMS.has(o.platform) &&
      typeof o.listed === "boolean"
    );
  });
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_ASSET_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "server-misconfigured", detail: "ADMIN_ASSET_INGEST_TOKEN not set" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!isValid(body)) {
    return NextResponse.json({ error: "invalid-record-shape" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: true, received: body.results.length, upserted: 0, skipped: 0, stub: "db-not-configured" },
      { status: 202 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  let upserted = 0;
  const skipped: string[] = [];
  try {
    for (const r of body.results) {
      try {
        await client.query(
          `INSERT INTO menu_listings
             (dispensary_id, platform, menu_url, listed, match_count, matched_names, error, checked_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
           ON CONFLICT (dispensary_id, platform) DO UPDATE SET
             menu_url      = EXCLUDED.menu_url,
             listed        = EXCLUDED.listed,
             match_count   = EXCLUDED.match_count,
             matched_names = EXCLUDED.matched_names,
             error         = EXCLUDED.error,
             checked_at    = now()`,
          [
            r.dispensary_id,
            r.platform,
            r.menu_url ?? null,
            r.listed,
            r.match_count ?? 0,
            JSON.stringify(r.matched_names ?? []),
            r.error ?? null,
          ],
        );
        upserted++;
      } catch {
        // Most likely an FK violation on an unknown dispensary_id.
        skipped.push(`${r.dispensary_id}:${r.platform}`);
      }
    }
    return NextResponse.json(
      { ok: true, received: body.results.length, upserted, skipped },
      { status: 202 },
    );
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({
    service: "buckmountain.farm/api/agent/menu-placement",
    method: "POST",
    schema: "buckmountain-farm/menu-placement/v1",
  });
}

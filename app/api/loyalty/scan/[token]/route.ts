/**
 * POST /api/loyalty/scan/[token]
 *
 * Records a QR-sticker scan. Authenticity-first.
 *
 * Workflow context (from Brendon 2026-05-24):
 *   - QR stickers printed in sheets of 50-75+ by the Photoshop team
 *   - Each token PRE-REGISTERED in qr_tokens before printing (no collisions)
 *   - v1 = AUTHENTICITY only. batch_id may be NULL.
 *
 * Behavior:
 *   1. Look up token in qr_tokens.
 *      - Not found → 404 (counterfeit signal).
 *      - Retired   → 410.
 *      - Active    → proceed.
 *   2. Insert qr_scans row (ip_hash, user_agent, geo from Vercel headers).
 *   3. Return { ok, product_slug?, coa_url?, scan_id, first_scan }.
 *
 * Fail-open: if the DB isn't configured (preview deploys), return a stub
 * 202 response so the user-facing scan page still works.
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";

function ipHash(ip: string): string {
  const day = new Date().toISOString().slice(0, 10);
  // Daily-rotating salt. No raw IPs stored.
  return createHash("sha256").update(`${day}:${ip}`).digest("hex").slice(0, 32);
}

type TokenLookup = {
  is_active: boolean;
  retired_at: string | null;
  product_slug: string | null;
  coa_url: string | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 6 || token.length > 32) {
    return NextResponse.json({ ok: false, error: "bad-token" }, { status: 400 });
  }

  const hdrs = req.headers;
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "0.0.0.0";
  const ua = hdrs.get("user-agent") ?? "";
  const geoCity = hdrs.get("x-vercel-ip-city") ?? null;
  const geoCountry = hdrs.get("x-vercel-ip-country") ?? null;
  const ip_hash = ipHash(ip);

  if (!dbConfigured()) {
    return NextResponse.json(
      {
        ok: true,
        token,
        scan_id: "stub-no-db",
        first_scan: true,
        product_slug: null,
        coa_url: null,
      },
      { status: 202 },
    );
  }

  const sql = getSql();

  // Token lookup + join through batches → products in one round trip.
  const lookup = (await sql`
    SELECT
      t.is_active,
      t.retired_at,
      p.slug AS product_slug,
      b.coa_url AS coa_url
    FROM qr_tokens t
    LEFT JOIN batches b  ON b.id = t.batch_id
    LEFT JOIN products p ON p.id = b.product_id
    WHERE t.token = ${token}
    LIMIT 1
  `) as TokenLookup[];

  if (lookup.length === 0) {
    return NextResponse.json(
      { ok: false, error: "not-a-valid-sticker" },
      { status: 404 },
    );
  }
  const row = lookup[0];
  if (!row.is_active) {
    return NextResponse.json(
      { ok: false, error: "token-retired", retired_at: row.retired_at },
      { status: 410 },
    );
  }

  // Append-only scan record.
  const inserted = (await sql`
    INSERT INTO qr_scans (token, ip_hash, user_agent, geo_city, geo_country)
    VALUES (${token}, ${ip_hash}, ${ua}, ${geoCity}, ${geoCountry})
    RETURNING id
  `) as { id: number }[];

  // First-scan check: prior count of scans for this token.
  const prior = (await sql`
    SELECT COUNT(*)::int AS n FROM qr_scans WHERE token = ${token}
  `) as { n: number }[];
  const first_scan = prior[0].n === 1;

  return NextResponse.json(
    {
      ok: true,
      token,
      scan_id: inserted[0].id,
      first_scan,
      product_slug: row.product_slug,
      coa_url: row.coa_url,
    },
    { status: 200 },
  );
}

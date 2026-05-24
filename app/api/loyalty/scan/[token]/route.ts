/**
 * POST /api/loyalty/scan/[token]
 *
 * Records a QR-sticker scan. Authenticity-first.
 *
 * Workflow context (from Brendon 2026-05-24):
 *   - QR stickers are printed in sheets of 50-75+ by the Photoshop team
 *   - Each sticker's token is PRE-REGISTERED in qr_tokens before printing
 *   - For v1 the sticker is an AUTHENTICITY stamp — does not have to
 *     be tied to a specific jar/batch (batch_id may be NULL)
 *   - For v2 we add jar-level tracking by linking print batches to product
 *
 * Endpoint behavior:
 *   1. Look up token in qr_tokens.
 *      - Not found → return 404 "not-a-valid-sticker" (counterfeit signal).
 *      - Retired → return 410 "token-retired".
 *      - Active → proceed.
 *   2. Insert qr_scans row (ip_hash, user_agent, geo via Vercel headers).
 *   3. Return { ok, product_slug?, coa_url?, scan_id, first_scan: bool }.
 *
 * The scan record is what fuels loyalty points later (after the user
 * opts in via Google SSO + /loyalty/claim/[token]).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function ipHash(ip: string): string {
  // Daily-salted sha256 (P3 — actually compute it). For now placeholder.
  const day = new Date().toISOString().slice(0, 10);
  return `placeholder-${day}-${ip.slice(0, 6)}`;
}

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

  // TODO(P3): real lookup against qr_tokens / insert qr_scans.
  // SELECT batch_id, is_active, retired_at FROM qr_tokens WHERE token = $1
  // If is_active=false → 410.
  // INSERT INTO qr_scans (token, ip_hash, user_agent, geo_city, geo_country)
  //   VALUES (...) RETURNING id;
  // SELECT p.slug, b.coa_url FROM qr_tokens t
  //   LEFT JOIN batches b ON b.id = t.batch_id
  //   LEFT JOIN products p ON p.id = b.product_id
  //   WHERE t.token = $1;
  const scanRow = {
    token,
    ip_hash: ipHash(ip),
    user_agent: ua,
    geo_city: geoCity,
    geo_country: geoCountry,
    scanned_at: new Date().toISOString(),
  };
  console.log("[loyalty:scan]", scanRow);

  return NextResponse.json(
    {
      ok: true,
      token,
      scan_id: "stub-scan-id",
      first_scan: true,
      // Until qr_tokens is seeded, these are null. Frontend handles that.
      product_slug: null,
      coa_url: null,
    },
    { status: 202 },
  );
}

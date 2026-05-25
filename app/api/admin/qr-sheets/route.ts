/**
 * POST /api/admin/qr-sheets
 *
 * Receives a QR-sticker sheet from the openclaw watcher.
 *
 * Body (schema buckmountain-farm/qr-sheet/v1):
 *   { schema, sheet_code, asset_id?, printer?, generated_at_iso?,
 *     tokens: string[], notes? }
 *
 * Behavior:
 *   1. UPSERT qr_sheets row by sheet_code (idempotent re-ingest).
 *   2. Bulk INSERT qr_tokens (token, sheet_id) ON CONFLICT (token)
 *      DO NOTHING — keeps batch_id NULL for v1 authenticity-only.
 *   3. Update qr_sheets.token_count to actual.
 *
 * Returns counts so the watcher can spot collisions.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getPool } from "@/lib/db";

export const runtime = "nodejs";

type Body = {
  schema: string;
  sheet_code?: string;
  asset_id?: string | null;
  printer?: string;
  generated_at_iso?: string;
  tokens: string[];
  notes?: string;
};

function isValid(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return (
    b.schema === "buckmountain-farm/qr-sheet/v1" &&
    Array.isArray(b.tokens) &&
    b.tokens.every(
      (t) => typeof t === "string" && t.length >= 6 && t.length <= 32,
    )
  );
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
      {
        ok: true,
        sheet_code: body.sheet_code ?? null,
        tokens_received: body.tokens.length,
        tokens_inserted: 0,
        tokens_skipped: 0,
        stub: "db-not-configured",
      },
      { status: 202 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert the sheet row.
    const sheetRow = await client.query(
      `INSERT INTO qr_sheets (sheet_code, asset_id, printer, generated_at, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sheet_code) DO UPDATE SET
         asset_id     = COALESCE(EXCLUDED.asset_id, qr_sheets.asset_id),
         printer      = COALESCE(EXCLUDED.printer,  qr_sheets.printer),
         generated_at = COALESCE(EXCLUDED.generated_at, qr_sheets.generated_at),
         notes        = COALESCE(EXCLUDED.notes,    qr_sheets.notes)
       RETURNING id`,
      [
        body.sheet_code ?? null,
        body.asset_id ?? null,
        body.printer ?? "photoshop-team",
        body.generated_at_iso ?? null,
        body.notes ?? null,
      ],
    );
    const sheet_id: number = sheetRow.rows[0].id;

    // 2. Bulk insert tokens. ON CONFLICT (token) DO NOTHING means
    //    re-ingesting a sheet is a no-op for tokens we already have.
    const insertResult = await client.query(
      `INSERT INTO qr_tokens (token, sheet_id)
       SELECT unnest($1::text[]), $2::bigint
       ON CONFLICT (token) DO NOTHING`,
      [body.tokens, sheet_id],
    );
    const tokens_inserted = insertResult.rowCount ?? 0;
    const tokens_skipped = body.tokens.length - tokens_inserted;

    // 3. Update token_count to match actual count for this sheet.
    await client.query(
      `UPDATE qr_sheets SET token_count = (
         SELECT COUNT(*) FROM qr_tokens WHERE sheet_id = $1
       ) WHERE id = $1`,
      [sheet_id],
    );

    await client.query("COMMIT");
    return NextResponse.json(
      {
        ok: true,
        sheet_id,
        sheet_code: body.sheet_code ?? null,
        tokens_received: body.tokens.length,
        tokens_inserted,
        tokens_skipped,
      },
      { status: 202 },
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const msg = err instanceof Error ? err.message : "insert-failed";
    return NextResponse.json({ error: "insert-failed", detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({
    service: "buckmountain.farm/api/admin/qr-sheets",
    method: "POST",
    schema: "buckmountain-farm/qr-sheet/v1",
  });
}

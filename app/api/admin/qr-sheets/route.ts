/**
 * POST /api/admin/qr-sheets
 *
 * Receives a QR-sticker sheet from the openclaw watcher. The watcher
 * picks up sheet images dropped into the synced folder by the Photoshop
 * dev team, decodes the QR codes in the image (pyzbar / zxing), and
 * POSTs the result here.
 *
 * Body shape (schema: buckmountain-farm/qr-sheet/v1):
 *   {
 *     schema: "buckmountain-farm/qr-sheet/v1",
 *     sheet_code: "BMC-2026-W21-A03",  // printer-side label or filename
 *     asset_id: "abcd1234..." | null,  // openclaw asset.id of the sheet image
 *     printer: "photoshop-team",
 *     generated_at_iso: "2026-05-24T...",
 *     tokens: ["tk_abc...", "tk_def...", ...]
 *   }
 *
 * Auth: Bearer ADMIN_ASSET_INGEST_TOKEN (same token the asset watcher uses
 * — single secret to manage on openclaw).
 *
 * Behavior:
 *   - INSERT qr_sheets row (skip if sheet_code already ingested)
 *   - For each token, INSERT INTO qr_tokens (token, sheet_id) ON CONFLICT
 *     DO NOTHING (so re-ingesting the same sheet is idempotent)
 *   - batch_id stays NULL for v1 — these are authenticity-only stickers
 *
 * Returns counts: { sheet_id, tokens_inserted, tokens_skipped }.
 */

import { NextResponse } from "next/server";

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
    b.tokens.every((t) => typeof t === "string" && t.length >= 6 && t.length <= 32)
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

  // TODO(P3):
  //   INSERT INTO qr_sheets (sheet_code, asset_id, printer, token_count, generated_at, notes)
  //     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (sheet_code) DO UPDATE ...
  //   INSERT INTO qr_tokens (token, sheet_id) SELECT unnest($7::text[]), $sheet_id
  //     ON CONFLICT (token) DO NOTHING;
  console.log("[qr-sheets:ingest]", {
    sheet_code: body.sheet_code,
    asset_id: body.asset_id,
    printer: body.printer,
    token_count: body.tokens.length,
    sample: body.tokens.slice(0, 3),
  });

  return NextResponse.json(
    {
      ok: true,
      sheet_code: body.sheet_code ?? null,
      tokens_received: body.tokens.length,
      tokens_inserted: body.tokens.length, // stub — real count after db wired
      tokens_skipped: 0,
    },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json({
    service: "buckmountain.farm/api/admin/qr-sheets",
    method: "POST",
    schema: "buckmountain-farm/qr-sheet/v1",
  });
}

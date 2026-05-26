/**
 * POST /api/agent/qr/request
 *
 * Pre-allocates N tokens for the Photoshop team to render. See
 * handoff/QR_STICKER_WORKFLOW.md for the full pipeline.
 *
 * Tokens are 12-char URL-safe random IDs from Web Crypto. Server-side
 * generation = zero collision risk.
 *
 * Flow:
 *   1. INSERT a qr_sheets row reserving the sheet_code.
 *   2. Generate N tokens, INSERT into qr_tokens (token, sheet_id,
 *      batch_id=NULL, is_active=true).
 *   3. Return tokens so the Photoshop team can render the sheet.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getPool } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

function makeToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return s;
}

function defaultSheetCode(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = Math.ceil(
    ((now.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7,
  );
  const ww = String(week).padStart(3, "0");
  const seq = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
  return `BMC-${year}-W${ww}-A${seq}`;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const count = Math.max(10, Math.min(5000, Number(form.get("count") ?? 0)));
  if (!count) {
    return NextResponse.json({ error: "count-required" }, { status: 422 });
  }
  const sheet_code =
    String(form.get("sheet_code") ?? "").trim() || defaultSheetCode();
  const notes = String(form.get("notes") ?? "").trim() || null;

  const tokens: string[] = [];
  for (let i = 0; i < count; i++) tokens.push(makeToken());

  if (!dbConfigured()) {
    if ((req.headers.get("accept") ?? "").includes("application/json")) {
      return NextResponse.json({
        ok: true,
        sheet_code,
        count,
        sample: tokens.slice(0, 3),
        stub: "db-not-configured",
      });
    }
    return NextResponse.redirect(
      new URL(`/agent/qr/request?allocated=${count}&sheet=${sheet_code}&stub=1`, req.url),
      303,
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Reserve the sheet row (no asset yet — pre-render).
    const sheetRow = await client.query(
      `INSERT INTO qr_sheets (sheet_code, printer, notes, token_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sheet_code) DO UPDATE SET notes = COALESCE(EXCLUDED.notes, qr_sheets.notes)
       RETURNING id`,
      [sheet_code, "photoshop-team", notes, count],
    );
    const sheet_id: number = sheetRow.rows[0].id;

    // Bulk insert. Collisions effectively impossible at 12 chars of URL-safe
    // base64; ON CONFLICT DO NOTHING is belt-and-suspenders.
    await client.query(
      `INSERT INTO qr_tokens (token, sheet_id)
       SELECT unnest($1::text[]), $2::bigint
       ON CONFLICT (token) DO NOTHING`,
      [tokens, sheet_id],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const msg = err instanceof Error ? err.message : "alloc-failed";
    return NextResponse.json({ error: "alloc-failed", detail: msg }, { status: 500 });
  } finally {
    client.release();
  }

  // Notify the Photoshop team with the token list + pickup path. Recipient
  // list comes from PHOTOSHOP_TEAM_RECIPIENTS (comma-separated emails).
  const photoshop = (process.env.PHOTOSHOP_TEAM_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const to of photoshop) {
    sendTransactional({
      template: "qr-sheet-allocated",
      to,
      vars: {
        sheet_code,
        count,
        tokens,
        notes,
        pickup_path:
          process.env.PHOTOSHOP_SYNC_PATH ??
          "Tailscale → openclaw:~/openclaw-media-ingestor/buckmountain/qr-sheets/",
      },
      related: { kind: "qr-allocation", id: sheet_code },
    }).catch(() => {});
  }

  if ((req.headers.get("accept") ?? "").includes("application/json")) {
    return NextResponse.json({
      ok: true,
      sheet_code,
      count,
      sample: tokens.slice(0, 3),
    });
  }
  return NextResponse.redirect(
    new URL(`/agent/qr/request?allocated=${count}&sheet=${sheet_code}`, req.url),
    303,
  );
}

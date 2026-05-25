/**
 * POST /api/agent/qr/request
 *
 * Pre-allocates N tokens for the Photoshop team to render onto a
 * sticker sheet. See handoff/QR_STICKER_WORKFLOW.md.
 *
 * Tokens are 12-char URL-safe random IDs, generated with the Web Crypto
 * API. Centralized generation = zero collision risk (the watcher refuses
 * sheets whose tokens we never allocated).
 *
 * Body (form): count (10-5000), sheet_code?, notes?
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

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
  // Rough ISO-week — good enough for human-readable codes.
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

  // TODO(P3): persist allocation into qr_sheets (status=pending-render)
  // + qr_tokens (sheet_id=NULL initially, linked when watcher ingests
  // the rendered sheet); drop tokens-<sheet_code>.txt onto the
  // Tailscale-synced folder via SSH or Tailscale Drop.
  console.log("[qr:allocated]", {
    sheet_code,
    count,
    sample: tokens.slice(0, 3),
    notes,
  });

  // Accept-aware response: form post -> redirect; API client -> JSON.
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

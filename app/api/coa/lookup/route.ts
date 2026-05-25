/**
 * GET /api/coa/lookup?tag=<metrc-tag>
 *
 * Looks up the COA PDF URL for a Metrc package tag. Redirects to the
 * PDF on success, returns a small HTML error page on miss so the user
 * understands what happened (instead of a JSON 404).
 *
 * Data path (P3):
 *   SELECT coa_url FROM batches WHERE metrc_package_tag = $1 AND coa_url IS NOT NULL;
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const METRC_RE = /^[A-Z0-9]{20,24}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tag = (url.searchParams.get("tag") ?? "").toUpperCase().trim();
  if (!tag) {
    return new NextResponse(htmlError("Enter a Metrc tag to look up a COA."), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (!METRC_RE.test(tag)) {
    return new NextResponse(
      htmlError("That doesn't look like a valid Metrc tag (20–24 chars, A–Z and 0–9)."),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  // TODO(P3): real SELECT against batches.
  const coa_url: string | null = null;

  if (!coa_url) {
    return new NextResponse(
      htmlError(
        `We couldn't find a COA for <code>${escapeHtml(tag)}</code>. If you bought this from a licensed retailer, email <a href="mailto:coa@buckmountain.farm">coa@buckmountain.farm</a> with a photo of the jar label.`,
      ),
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  return NextResponse.redirect(coa_url, 302);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function htmlError(msg: string): string {
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>COA lookup — Buck Mountain Cannabis</title>
  <style>
    body { background:#0a0a0a; color:#fafafa; font-family: ui-sans-serif, system-ui, sans-serif; margin:0; padding:2rem; }
    .card { max-width: 32rem; margin: 4rem auto; background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 1.5rem; }
    h1 { margin:0 0 .75rem; font-size: 1.5rem; }
    p { line-height: 1.5; color: rgba(255,255,255,0.8); }
    a { color: #c9a24a; }
    code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-size: .9em; }
  </style>
</head><body>
  <div class="card">
    <h1>COA lookup</h1>
    <p>${msg}</p>
    <p><a href="/coa">← Try another tag</a></p>
  </div>
</body></html>`;
}

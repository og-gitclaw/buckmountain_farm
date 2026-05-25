/**
 * POST /api/agent/visit-report
 *
 * Form-encoded body from /agent/visit-report:
 *   dispensary_id, contact_name, summary, action_items (newline-separated)
 *
 * Inserts into visit_reports + updates dispensaries.last_visit_at.
 * Currently logs only — DB write lands when Neon is wired.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const dispensary_id = String(form.get("dispensary_id") ?? "").trim();
  const contact_name = String(form.get("contact_name") ?? "").trim() || null;
  const summary = String(form.get("summary") ?? "").trim() || null;
  const action_items_raw = String(form.get("action_items") ?? "").trim();
  const action_items = action_items_raw
    ? action_items_raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (!dispensary_id) {
    return NextResponse.json(
      { error: "dispensary-id-required" },
      { status: 422 },
    );
  }

  // TODO(P3): require session, derive agent_id from bm_session, then:
  //   INSERT INTO visit_reports (agent_id, dispensary_id, contact_name,
  //                              summary, action_items)
  //     VALUES (...);
  //   UPDATE dispensaries SET updated_at = now() WHERE id = $1;
  console.log("[visit:filed]", {
    dispensary_id,
    contact_name,
    summary,
    action_items,
  });

  return NextResponse.redirect(
    new URL(`/agent/dispensaries/${encodeURIComponent(dispensary_id)}?visit=ok`, req.url),
    303,
  );
}

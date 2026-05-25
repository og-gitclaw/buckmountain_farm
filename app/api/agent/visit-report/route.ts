/**
 * POST /api/agent/visit-report
 *
 * Inserts visit_reports row + bumps dispensaries.updated_at.
 *
 * For now agent_id is hard-stubbed to 1 because the agents table isn't
 * seeded — once /agent/login flows seed agent rows on first sign-in
 * (P4), we'll derive agent_id from session.sub instead.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const dispensary_id = String(form.get("dispensary_id") ?? "").trim();
  const contact_name = String(form.get("contact_name") ?? "").trim() || null;
  const summary = String(form.get("summary") ?? "").trim() || null;
  const action_items_raw = String(form.get("action_items") ?? "").trim();
  const action_items = action_items_raw
    ? action_items_raw.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!dispensary_id) {
    return NextResponse.json({ error: "dispensary-id-required" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.redirect(
      new URL(`/agent/dispensaries/${encodeURIComponent(dispensary_id)}?visit=stub`, req.url),
      303,
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Ensure a placeholder agent row exists until SSO-driven seeding is in place.
    const agent = await client.query(
      `INSERT INTO agents (google_sub, email, display_name, role)
       VALUES ('system-placeholder', 'system@buckmountain.farm', 'System', 'admin')
       ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
    );
    const agent_id: number = agent.rows[0].id;

    await client.query(
      `INSERT INTO visit_reports
        (agent_id, dispensary_id, contact_name, summary, action_items)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [agent_id, dispensary_id, contact_name, summary, JSON.stringify(action_items)],
    );
    await client.query(
      `UPDATE dispensaries SET updated_at = now() WHERE id = $1`,
      [dispensary_id],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const detail = err instanceof Error ? err.message : "insert-failed";
    return NextResponse.json({ error: "insert-failed", detail }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.redirect(
    new URL(`/agent/dispensaries/${encodeURIComponent(dispensary_id)}?visit=ok`, req.url),
    303,
  );
}

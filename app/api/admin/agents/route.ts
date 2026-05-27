/**
 * POST /api/admin/agents
 *
 * Two actions, distinguished by the `action` form field:
 *
 *   action=create    INSERT a new agent row from { google_sub, email,
 *                    display_name?, role } — ON CONFLICT(google_sub) DO
 *                    NOTHING so the form is safe to resubmit.
 *
 *   action=update    UPDATE an existing agent's { role, display_name?,
 *                    is_active } by id.
 *
 * Both write to `audit_log` so we can answer "who promoted whom, when"
 * after the fact. Actor is currently 'admin-dashboard' — when admin pages
 * gain session-driven role gating (P3), we'll plumb session.email through.
 *
 * Auth (P3): admin role required. Today this endpoint sits behind Vercel
 * Deployment Protection only, like the other /admin/* surfaces.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";

const ROLE_SET = new Set(["rep", "manager", "admin"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function backWithError(req: Request, error: string): NextResponse {
  const url = new URL(`/admin/agents?error=${encodeURIComponent(error)}`, req.url);
  return NextResponse.redirect(url, 303);
}

function backWithOk(req: Request, ok: string): NextResponse {
  const url = new URL(`/admin/agents?ok=${encodeURIComponent(ok)}`, req.url);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "").trim();

  if (action === "create") {
    const google_sub = String(form.get("google_sub") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const display_name = String(form.get("display_name") ?? "").trim() || null;
    const role = String(form.get("role") ?? "rep").trim();

    if (!google_sub) return backWithError(req, "google-sub-required");
    if (!email || !EMAIL_RE.test(email)) return backWithError(req, "valid-email-required");
    if (!ROLE_SET.has(role)) return backWithError(req, "invalid-role");

    if (!dbConfigured()) return backWithError(req, "database-not-configured");
    const sql = getSql();

    try {
      const rows = (await sql`
        INSERT INTO agents (google_sub, email, display_name, role)
        VALUES (${google_sub}, ${email}, ${display_name}, ${role})
        ON CONFLICT (google_sub) DO NOTHING
        RETURNING id
      `) as { id: number }[];
      const inserted = rows[0]?.id;
      if (!inserted) {
        return backWithError(req, "already-exists");
      }
      await sql`
        INSERT INTO audit_log (actor, action, target_kind, target_id, payload)
        VALUES (
          'admin-dashboard',
          'agent.create',
          'agent',
          ${String(inserted)},
          ${JSON.stringify({ google_sub, email, role, display_name })}::jsonb
        )
      `;
      return backWithOk(req, "created");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "insert-failed";
      return backWithError(req, `insert-failed:${detail}`);
    }
  }

  if (action === "update") {
    const idRaw = String(form.get("id") ?? "").trim();
    const id = Number(idRaw);
    const role = String(form.get("role") ?? "").trim();
    const display_name = String(form.get("display_name") ?? "").trim() || null;
    const is_active = form.get("is_active") === "on";

    if (!Number.isInteger(id) || id <= 0) return backWithError(req, "invalid-id");
    if (!ROLE_SET.has(role)) return backWithError(req, "invalid-role");

    if (!dbConfigured()) return backWithError(req, "database-not-configured");
    const sql = getSql();

    try {
      const rows = (await sql`
        UPDATE agents
           SET role = ${role},
               display_name = ${display_name},
               is_active = ${is_active}
         WHERE id = ${id}
         RETURNING id, google_sub, role, is_active
      `) as {
        id: number;
        google_sub: string;
        role: string;
        is_active: boolean;
      }[];
      if (rows.length === 0) return backWithError(req, "agent-not-found");
      const updated = rows[0];
      await sql`
        INSERT INTO audit_log (actor, action, target_kind, target_id, payload)
        VALUES (
          'admin-dashboard',
          'agent.update',
          'agent',
          ${String(updated.id)},
          ${JSON.stringify({
            google_sub: updated.google_sub,
            role: updated.role,
            is_active: updated.is_active,
            display_name,
          })}::jsonb
        )
      `;
      return backWithOk(req, "updated");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "update-failed";
      return backWithError(req, `update-failed:${detail}`);
    }
  }

  return backWithError(req, "unknown-action");
}

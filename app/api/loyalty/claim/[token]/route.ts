/**
 * POST /api/loyalty/claim/[token]
 *
 * Completes the loyalty loop. Requires a session.
 *
 * Idempotent on (optin_id, token): a second claim of the same sticker
 * by the same user returns the existing balance without double-crediting.
 * The trick: we only credit when UPDATE qr_scans ... WHERE optin_id IS NULL
 * actually moves a row. If it doesn't, someone already claimed that scan.
 *
 * Uses a real BEGIN/COMMIT transaction via the WebSocket pool so the
 * scan→optin link, the rewards_ledger insert, and the optin upsert all
 * succeed or fail together.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConfigured, getPool } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

const POINTS_PER_SCAN = 10;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { token } = await ctx.params;
  if (!token || token.length < 6 || token.length > 32) {
    return NextResponse.json({ error: "bad-token" }, { status: 400 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: true, token, credited: 0, balance: 0, first_claim: true, stub: true },
      { status: 200 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Validate token is active.
    const tok = await client.query(
      `SELECT is_active FROM qr_tokens WHERE token = $1 FOR UPDATE`,
      [token],
    );
    if (tok.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "not-a-valid-sticker" }, { status: 404 });
    }
    if (!tok.rows[0].is_active) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "token-retired" }, { status: 410 });
    }

    // 2. Upsert the opt-in (Google sub is the natural key).
    const optin = await client.query(
      `INSERT INTO oglife_optins (oglife_user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [session.sub, session.email],
    );
    const optin_id: number = optin.rows[0].id;

    // 3. Link the most recent unclaimed scan of this token to this user.
    const linked = await client.query(
      `UPDATE qr_scans
         SET optin_id = $1
       WHERE id = (
         SELECT id FROM qr_scans
          WHERE token = $2 AND optin_id IS NULL
          ORDER BY scanned_at DESC
          LIMIT 1
       )
       RETURNING id`,
      [optin_id, token],
    );

    let credited = 0;
    let first_claim = false;
    if (linked.rows.length > 0) {
      // 4. Credit points only when we actually linked a fresh scan.
      first_claim = true;
      credited = POINTS_PER_SCAN;
      await client.query(
        `INSERT INTO rewards_ledger (optin_id, delta_tokens, reason, related_scan_id)
         VALUES ($1, $2, 'scan-bonus', $3)`,
        [optin_id, POINTS_PER_SCAN, linked.rows[0].id],
      );
    }

    // 5. Current balance + product name (for email body).
    const bal = await client.query(
      `SELECT COALESCE(SUM(delta_tokens), 0)::int AS balance
         FROM rewards_ledger WHERE optin_id = $1`,
      [optin_id],
    );
    const balance: number = bal.rows[0].balance;

    const prod = await client.query(
      `SELECT p.name, p.slug
         FROM qr_tokens t
         LEFT JOIN batches b  ON b.id = t.batch_id
         LEFT JOIN products p ON p.id = b.product_id
        WHERE t.token = $1`,
      [token],
    );
    const product_name: string | null = prod.rows[0]?.name ?? null;
    const product_slug: string | null = prod.rows[0]?.slug ?? null;

    await client.query("COMMIT");

    // Fire credit confirmation only when we actually credited.
    if (credited > 0) {
      sendTransactional({
        template: "scan-points-credited",
        to: session.email,
        vars: {
          points: credited,
          balance,
          product_name,
          product_url: product_slug ? `https://buckmountain.farm/strains/${product_slug}` : null,
        },
        optin_id,
        related: { kind: "scan-claim", id: token },
      }).catch(() => {});
    }

    return NextResponse.json(
      { ok: true, token, credited, balance, first_claim },
      { status: 200 },
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const msg = err instanceof Error ? err.message : "claim-failed";
    return NextResponse.json({ error: "claim-failed", detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

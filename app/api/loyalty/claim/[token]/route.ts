/**
 * POST /api/loyalty/claim/[token]
 *
 * Completes the loyalty loop:
 *   1. Verify session (bm_session cookie). Without it: 401.
 *   2. Confirm token exists + is active in qr_tokens.
 *   3. Link the most recent anon scan of this token to oglife_optins.id.
 *   4. Credit +N reward tokens to rewards_ledger.
 *   5. Return { ok, balance, scan_id, batch_id? } so the claim page
 *      can show a confirmation.
 *
 * Idempotent on (optin_id, token): a second claim of the same sticker
 * returns the existing record + does NOT double-credit.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

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

  // TODO(P3) real SQL when Neon lands:
  //   BEGIN;
  //   SELECT batch_id, is_active FROM qr_tokens WHERE token = $1 FOR UPDATE;
  //     -- if not active or not found, 410/404
  //   INSERT INTO oglife_optins (oglife_user_id, email) VALUES ($sub, $email)
  //     ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
  //     RETURNING id INTO _optin_id;
  //   UPDATE qr_scans SET optin_id = _optin_id
  //     WHERE id = (SELECT id FROM qr_scans WHERE token = $1
  //                 ORDER BY scanned_at DESC LIMIT 1)
  //     AND optin_id IS NULL;
  //     -- if no rows updated, this token was already claimed -> idempotent return
  //   INSERT INTO rewards_ledger (optin_id, delta_tokens, reason, related_scan_id)
  //     VALUES (_optin_id, $points, 'scan-bonus', _scan_id);
  //   COMMIT;
  console.log("[loyalty:claim]", {
    sub: session.sub,
    email: session.email,
    token,
    points: POINTS_PER_SCAN,
  });

  return NextResponse.json(
    {
      ok: true,
      token,
      credited: POINTS_PER_SCAN,
      balance: POINTS_PER_SCAN,
      first_claim: true,
    },
    { status: 200 },
  );
}

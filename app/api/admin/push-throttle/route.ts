/**
 * POST /api/admin/push-throttle
 *
 * Super-admin only. Arms (or disarms) the synthetic fault injection in
 * lib/push.ts sendToOne so the retry path in sendWithRetry can be
 * exercised end-to-end without contacting FCM/APNs/Mozilla autopush.
 *
 * Body:
 *   { enabled: boolean,
 *     remaining: number (>= 0),
 *     status_code: 429 | 500 | 502 | 503 | 504,
 *     retry_after_seconds?: number | null }
 *
 * Auth:
 *   - Must have a signed session (bm_session cookie).
 *   - session.email must be in the super-admin allowlist (lib/super-admin).
 *   - 403 for any other admin/agent/customer.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getSql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/super-admin";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set([429, 500, 502, 503, 504]);

type Body = {
  enabled?: unknown;
  remaining?: unknown;
  status_code?: unknown;
  retry_after_seconds?: unknown;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const enabled = body.enabled === true;
  const remaining = Number(body.remaining);
  const statusCode = Number(body.status_code);
  const retryAfter =
    body.retry_after_seconds == null || body.retry_after_seconds === ""
      ? null
      : Number(body.retry_after_seconds);

  if (!Number.isInteger(remaining) || remaining < 0 || remaining > 10_000) {
    return NextResponse.json({ error: "invalid-remaining" }, { status: 422 });
  }
  if (!ALLOWED_STATUS.has(statusCode)) {
    return NextResponse.json({ error: "invalid-status-code" }, { status: 422 });
  }
  if (retryAfter != null && (!Number.isInteger(retryAfter) || retryAfter < 0 || retryAfter > 600)) {
    return NextResponse.json({ error: "invalid-retry-after" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: true, stub: "db-not-configured" },
      { status: 202 },
    );
  }

  const sql = getSql();
  await sql`
    UPDATE push_fault_injection
       SET enabled             = ${enabled},
           remaining           = ${remaining},
           status_code         = ${statusCode},
           retry_after_seconds = ${retryAfter},
           updated_by          = ${session.email},
           updated_at          = now()
     WHERE id = 1
  `;

  return NextResponse.json({
    ok: true,
    enabled,
    remaining,
    status_code: statusCode,
    retry_after_seconds: retryAfter,
  });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cloverConfigured, cloverEnv, stubMode } from "@/lib/billing/clover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Card-form config, read at RUNTIME from server env rather than inlined at
 * build time — rotating a key shouldn't need a rebuild.
 *
 * Only the PUBLISHABLE PAKMS key, the merchant id, and the environment leave
 * the server. CLOVER_API_TOKEN is private and must never appear here. Admin
 * only: the card form is an admin screen, so there is no reason to hand the
 * merchant id to the open internet.
 *
 * Auth note: this path sits outside middleware.ts's original matcher (which
 * covered /api/admin and /api/agent), so the session check here is not
 * belt-and-braces — it is the gate. The matcher was widened to cover it too;
 * both are deliberate.
 */
export async function GET(): Promise<NextResponse> {
  if (!(await getSession())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const pakms = process.env.CLOVER_PAKMS?.trim() ?? "";
  const merchantId = process.env.CLOVER_MERCHANT_ID?.trim() ?? "";
  const stub = stubMode();
  return NextResponse.json({
    pakms,
    merchantId,
    env: cloverEnv(),
    // The card form only mounts when a real processor is behind it.
    configured: cloverConfigured() && !!pakms && !stub,
    // True only when the server takes no money at all. The test-card shortcut
    // hangs off this — offering it while real credentials are loaded would
    // send a made-up token to the live processor.
    stub,
  });
}

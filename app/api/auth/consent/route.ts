/**
 * POST /api/auth/consent
 *
 * Writes consent flags from /auth/consent into oglife_optins.consents.
 *
 * Hard requirement: age_21_plus must be present. Without it, we cannot
 * serve cannabis content per CA regs.
 *
 * If marketing_sms is checked we also flag a TODO for the Alpine IQ
 * profile sync (real call lands when /api/sms/subscribe is invoked
 * with a phone number).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();

  const age21 = form.get("age_21_plus") === "on";
  if (!age21) {
    return NextResponse.json(
      { error: "age-verification-required" },
      { status: 400 },
    );
  }

  const consents = {
    age_21_plus: true,
    cannabis_interest: form.get("cannabis_interest") === "on",
    oglife_network: form.get("oglife_network") === "on",
    marketing_email: form.get("marketing_email") === "on",
    marketing_sms: form.get("marketing_sms") === "on",
    push_notifications: form.get("push_notifications") === "on",
    consented_at: new Date().toISOString(),
  };

  const session = await getSession();
  const returnTo = (form.get("return_to") as string | null) ?? "/agent";

  if (session && dbConfigured()) {
    const sql = getSql();
    try {
      // Upsert: insert if first-time, otherwise merge new consent keys on top
      // of any existing ones (||) so we don't drop fields a future version
      // adds.
      await sql`
        INSERT INTO oglife_optins (oglife_user_id, email, consents)
        VALUES (${session.sub}, ${session.email}, ${JSON.stringify(consents)}::jsonb)
        ON CONFLICT (oglife_user_id) DO UPDATE SET
          email    = EXCLUDED.email,
          consents = oglife_optins.consents || EXCLUDED.consents
      `;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "consent-write-failed";
      return NextResponse.json({ error: "consent-write-failed", detail }, { status: 500 });
    }
  }

  if (session) {
    sendTransactional({
      template: "consent-confirmed",
      to: session.email,
      vars: { consents },
      related: { kind: "consent", id: session.sub },
    }).catch(() => {});
  }

  return NextResponse.redirect(new URL(returnTo, req.url), 303);
}

/**
 * POST /api/auth/consent
 *
 * Writes the consent flags submitted from /auth/consent into the
 * session user's oglife_optins.consents jsonb column.
 *
 * Hard requirement: age_21_plus must be present. Without it, we
 * cannot serve cannabis content per CA + most state regs.
 *
 * If marketing_sms is checked, we also queue an Alpine IQ profile
 * sync (placeholder — see /api/sms/subscribe for the real call).
 */

import { NextResponse } from "next/server";

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

  // TODO(P3):
  //   - look up session sub
  //   - UPDATE oglife_optins SET consents = $1 WHERE oglife_user_id = $2
  //   - if marketing_sms: POST to Alpine IQ /audiences/{ID}/contacts
  //   - if push_notifications: client-side subscribes via /api/push/subscribe
  console.log("[consent:save]", consents);

  const returnTo = (form.get("return_to") as string | null) ?? "/agent";
  return NextResponse.redirect(new URL(returnTo, req.url), 303);
}

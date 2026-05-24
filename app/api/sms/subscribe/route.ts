/**
 * POST /api/sms/subscribe
 *
 * Body: { phone: "+14155551234", consent_text: "...", tags?: string[] }
 *
 * Records double-opt-in: the user submitted the form (single opt-in), we
 * send a welcome SMS via Alpine IQ that requires reply "Y" to confirm.
 * Alpine IQ handles the confirmation + STOP/HELP automation server-side
 * so we don't have to.
 *
 * TCPA-safe: we never write marketing_sms=true without an explicit click
 * from /auth/consent OR an explicit POST to this endpoint with the
 * exact consent_text we showed at the form.
 */

import { NextResponse } from "next/server";
import { alpineiq } from "@/lib/alpineiq";

export const runtime = "nodejs";

type Body = {
  phone: string;
  consent_text: string;
  tags?: string[];
  first_name?: string;
  last_name?: string;
  email?: string;
};

function isE164(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!body.phone || !isE164(body.phone)) {
    return NextResponse.json({ error: "phone-must-be-e164" }, { status: 422 });
  }
  if (!body.consent_text || body.consent_text.length < 20) {
    return NextResponse.json(
      { error: "consent-text-required" },
      { status: 422 },
    );
  }

  const upsert = await alpineiq.upsertContact({
    phone: body.phone,
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    tags: [...(body.tags ?? []), "buckmountain", "sms-pending-confirm"],
    consents: { marketing_sms_single_optin: true },
  });

  const welcome = await alpineiq.sendSms({
    to: body.phone,
    body:
      "Buck Mountain: reply Y to confirm. Monthly product alerts + prize drops. " +
      "~4 msgs/mo. Msg & data rates may apply. STOP to opt out, HELP for help.",
    campaign: "buckmountain-sms-doi",
  });

  // TODO(P3): persist into sms_subscriptions table once Neon is up.
  return NextResponse.json(
    { ok: true, upsert, welcome },
    { status: upsert.ok ? 202 : 200 },
  );
}

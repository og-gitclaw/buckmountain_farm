/**
 * POST /api/sms/subscribe
 *
 * Single-opt-in form → upserts sms_subscriptions row (status='pending')
 * + sends Alpine IQ double-opt-in welcome SMS. Alpine IQ's webhook
 * (handled at /api/alpineiq/webhook) flips status='confirmed' once the
 * user replies Y, or 'stopped' on STOP.
 *
 * TCPA-safe: the exact consent_text shown to the user is stored on the
 * row so we can produce evidence of opt-in if a carrier audits.
 */

import { NextResponse } from "next/server";
import { alpineiq } from "@/lib/alpineiq";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";

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
    return NextResponse.json({ error: "consent-text-required" }, { status: 422 });
  }

  // Mirror Alpine IQ upsert first so we have the contact id to store.
  const upsert = await alpineiq.upsertContact({
    phone: body.phone,
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name,
    tags: [...(body.tags ?? []), "buckmountain", "sms-pending-confirm"],
    consents: { marketing_sms_single_optin: true },
  });
  const alpineiq_contact_id =
    upsert.ok && upsert.data && typeof upsert.data === "object" && "id" in upsert.data
      ? String((upsert.data as { id: string }).id)
      : null;

  if (dbConfigured()) {
    const sql = getSql();
    const session = await getSession();
    let optin_id: number | null = null;
    if (session) {
      const rows = (await sql`
        INSERT INTO oglife_optins (oglife_user_id, email)
        VALUES (${session.sub}, ${session.email})
        ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `) as { id: number }[];
      optin_id = rows[0].id;
    }
    try {
      await sql`
        INSERT INTO sms_subscriptions
          (optin_id, phone_e164, alpineiq_contact_id, consent_text, status)
        VALUES
          (${optin_id}, ${body.phone}, ${alpineiq_contact_id}, ${body.consent_text}, 'pending')
        ON CONFLICT (phone_e164) DO UPDATE SET
          consent_text         = EXCLUDED.consent_text,
          alpineiq_contact_id  = COALESCE(EXCLUDED.alpineiq_contact_id, sms_subscriptions.alpineiq_contact_id),
          optin_id             = COALESCE(EXCLUDED.optin_id, sms_subscriptions.optin_id),
          single_optin_at      = now()
      `;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "sms-save-failed";
      return NextResponse.json({ error: "sms-save-failed", detail }, { status: 500 });
    }
  }

  const welcome = await alpineiq.sendSms({
    to: body.phone,
    body:
      "Buck Mountain: reply Y to confirm. Monthly product alerts + prize drops. " +
      "~4 msgs/mo. Msg & data rates may apply. STOP to opt out, HELP for help.",
    campaign: "buckmountain-sms-doi",
  });

  return NextResponse.json(
    { ok: true, upsert, welcome },
    { status: upsert.ok ? 202 : 200 },
  );
}

/**
 * POST /api/email/test
 *
 * Fires the welcome template at a target address. Lets you smoke-test the
 * SES wiring from the admin UI without scanning a token or signing up.
 *
 * Auth: protected by Vercel deployment protection. Once that comes off
 * for the marketing site we'll add a session+role check here.
 */

import { NextResponse } from "next/server";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const to = String(form.get("to") ?? "").trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "invalid-email" }, { status: 422 });
  }
  const result = await sendTransactional({
    template: "welcome",
    to,
    vars: { recipient_name: "Test" },
    related: { kind: "email-test", id: new Date().toISOString() },
  });
  return NextResponse.redirect(
    new URL(`/admin/emails?test=${result.ok ? "ok" : "fail"}`, req.url),
    303,
  );
}

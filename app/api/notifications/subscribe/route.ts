/**
 * POST /api/notifications/subscribe
 *
 * User-facing "ping me when X drops" subscribe endpoint.
 *
 * Writes into product_notification_subscribers. Links to oglife_optins
 * by session sub if present; anonymous subscriptions are allowed (optin_id
 * stays NULL) so the homepage form works pre-signup.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let strain_slug = "";
  let channel = "push";
  let product_slug: string | null = null;
  let category: string | null = null;

  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;
    strain_slug = body.strain_slug ?? "";
    channel = body.channel ?? "push";
    product_slug = body.product_slug ?? null;
    category = body.category ?? null;
  } else {
    const form = await req.formData();
    strain_slug = String(form.get("strain_slug") ?? "");
    channel = String(form.get("channel") ?? "push");
    product_slug = (form.get("product_slug") as string | null) ?? null;
    category = (form.get("category") as string | null) ?? null;
  }

  if (!["push", "sms", "email"].includes(channel)) {
    return NextResponse.json({ error: "invalid-channel" }, { status: 422 });
  }
  if (!strain_slug && !product_slug && !category) {
    return NextResponse.json(
      { error: "must-specify-strain-product-or-category" },
      { status: 422 },
    );
  }

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
        INSERT INTO product_notification_subscribers
          (optin_id, channel, product_slug, strain_slug, category, is_active)
        VALUES
          (${optin_id}, ${channel}, ${product_slug}, ${strain_slug || null}, ${category}, true)
        ON CONFLICT (optin_id, channel, product_slug, strain_slug, category)
        DO UPDATE SET is_active = true
      `;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "subscribe-failed";
      return NextResponse.json({ error: "subscribe-failed", detail }, { status: 500 });
    }
  }

  // Confirmation email only when we know who they are.
  if (dbConfigured()) {
    const session = await getSession();
    if (session?.email) {
      sendTransactional({
        template: "subscription-confirmed",
        to: session.email,
        vars: {
          strain_slug: strain_slug || null,
          product_slug,
          category,
          channel: channel as "push" | "sms" | "email",
        },
        related: { kind: "notification-sub", id: strain_slug || product_slug || category || "" },
      }).catch(() => {});
    }
  }

  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/strains/updates?subscribed=1", req.url), 303);
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}

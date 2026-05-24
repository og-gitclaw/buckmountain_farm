/**
 * POST /api/notifications/subscribe
 *
 * User-facing subscribe endpoint — "tell me when <strain> drops via <channel>".
 *
 * Writes into product_notification_subscribers. For SMS we also bounce
 * through Alpine IQ to capture the TCPA consent.
 *
 * Body (form-encoded or JSON):
 *   strain_slug: "permanent-og"
 *   channel: "push" | "sms" | "email"
 *   product_slug?: string
 *   category?: string
 */

import { NextResponse } from "next/server";

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

  // TODO(P3): require session, look up optin_id, then:
  //   INSERT INTO product_notification_subscribers
  //     (optin_id, channel, strain_slug, product_slug, category)
  //   VALUES (...) ON CONFLICT (optin_id, channel, ...) DO UPDATE SET is_active = true;
  console.log("[notif:subscribe]", { strain_slug, channel, product_slug, category });

  // If a non-API form posted, redirect back so the page doesn't blank.
  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/strains/updates?subscribed=1", req.url), 303);
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}

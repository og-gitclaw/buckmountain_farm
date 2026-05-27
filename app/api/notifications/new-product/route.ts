/**
 * POST /api/notifications/new-product
 *
 * Broadcasts a "new product / new drop" notification across both channels:
 *   1. Alpine IQ SMS campaign (audience filtered by consent + state)
 *   2. Web Push (VAPID) to every subscription
 *
 * Triggered from /agent/notifications (an agent fires it manually after
 * a delivery lands), or from a scheduled job when a Nabis inventory pull
 * shows a new SKU/batch.
 *
 * Auth: Bearer ADMIN_API_TOKEN (separate from ADMIN_ASSET_INGEST_TOKEN).
 *
 * Body:
 *   {
 *     product_slug: "permanent-og",
 *     headline: "Permanent OG just landed",
 *     body: "Light-assist indoor, batch dropped today. Check the menu.",
 *     cta_url: "/strains/permanent-og",
 *     audience_id?: "<alpineiq audience id>",
 *     dispensary_filter?: ["disp-1", "disp-2"]
 *   }
 */

import { NextResponse } from "next/server";
import { alpineiq } from "@/lib/alpineiq";
import { broadcast as pushBroadcast } from "@/lib/push";

export const runtime = "nodejs";

type Body = {
  product_slug: string;
  headline: string;
  body: string;
  cta_url: string;
  audience_id?: string;
  dispensary_filter?: string[];
};

export async function POST(req: Request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "server-misconfigured", detail: "ADMIN_API_TOKEN not set" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!body.product_slug || !body.headline || !body.body || !body.cta_url) {
    return NextResponse.json({ error: "missing-fields" }, { status: 422 });
  }

  const audienceId =
    body.audience_id ?? process.env.ALPINEIQ_DEFAULT_AUDIENCE_ID ?? "";
  let smsResult: unknown = { skipped: true, reason: "no-audience-id" };
  if (audienceId) {
    smsResult = await alpineiq.broadcastNewProduct({
      audience_id: audienceId,
      product_slug: body.product_slug,
      headline: body.headline,
      body: body.body,
      cta_url: body.cta_url,
    });
  }

  const pushResult = await pushBroadcast({
    title: body.headline,
    body: body.body,
    url: body.cta_url,
    tag: `new-product:${body.product_slug}`,
  });

  return NextResponse.json(
    {
      ok: true,
      product_slug: body.product_slug,
      sms: smsResult,
      push: pushResult,
    },
    { status: 202 },
  );
}

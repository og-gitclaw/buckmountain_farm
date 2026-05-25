/**
 * POST /api/admin/strain-updates
 *
 * Creates a strain_updates row. Optionally also fires a new-product blast
 * (SMS via Alpine IQ + Web Push) so the same submit covers both surfaces.
 */

import { NextResponse } from "next/server";
import { alpineiq } from "@/lib/alpineiq";
import { broadcast as pushBroadcast } from "@/lib/push";

export const runtime = "nodejs";

const KIND_SET = new Set(["new-drop", "batch-update", "coming-soon", "limited"]);

export async function POST(req: Request) {
  const form = await req.formData();
  const strain_slug = String(form.get("strain_slug") ?? "").trim();
  const kind = String(form.get("kind") ?? "").trim();
  const headline = String(form.get("headline") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const also_blast = form.get("also_blast") === "on";

  if (!strain_slug) {
    return NextResponse.json({ error: "strain-required" }, { status: 422 });
  }
  if (!KIND_SET.has(kind)) {
    return NextResponse.json({ error: "invalid-kind" }, { status: 422 });
  }
  if (!headline || !body) {
    return NextResponse.json({ error: "headline-and-body-required" }, { status: 422 });
  }

  // TODO(P3): INSERT INTO strain_updates (...) RETURNING id;
  console.log("[strain-update:create]", { strain_slug, kind, headline });

  let blastResult: unknown = { skipped: true, reason: "not-requested" };
  if (also_blast) {
    const audienceId = process.env.ALPINEIQ_DEFAULT_AUDIENCE_ID ?? "";
    const sms = audienceId
      ? await alpineiq.broadcastNewProduct({
          audience_id: audienceId,
          product_slug: strain_slug,
          headline,
          body,
          cta_url: `/strains/${strain_slug}`,
        })
      : { skipped: true as const, reason: "no-audience-id" };
    const push = await pushBroadcast({
      title: headline,
      body,
      url: `/strains/${strain_slug}`,
      tag: `strain-update:${strain_slug}`,
    });
    blastResult = { sms, push };
  }

  return NextResponse.redirect(
    new URL(`/strains/${encodeURIComponent(strain_slug)}?posted=1`, req.url),
    303,
  );
}

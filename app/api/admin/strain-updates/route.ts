/**
 * POST /api/admin/strain-updates
 *
 * Creates a strain_updates row. Optionally also fires a new-product blast
 * (SMS via Alpine IQ + Web Push) so the same submit covers both surfaces.
 */

import { NextResponse } from "next/server";
import { alpineiq } from "@/lib/alpineiq";
import { broadcast as pushBroadcast } from "@/lib/push";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

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

  if (dbConfigured()) {
    const sql = getSql();
    try {
      await sql`
        INSERT INTO strain_updates (strain_slug, headline, body, kind)
        VALUES (${strain_slug}, ${headline}, ${body}, ${kind})
      `;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "insert-failed";
      return NextResponse.json({ error: "insert-failed", detail }, { status: 500 });
    }
  }

  if (also_blast) {
    const audienceId = process.env.ALPINEIQ_DEFAULT_AUDIENCE_ID ?? "";
    if (audienceId) {
      await alpineiq.broadcastNewProduct({
        audience_id: audienceId,
        product_slug: strain_slug,
        headline,
        body,
        cta_url: `/strains/${strain_slug}`,
      });
    }
    await pushBroadcast({
      title: headline,
      body,
      url: `/strains/${strain_slug}`,
      tag: `strain-update:${strain_slug}`,
    });

    // Email blast — fan out to every active subscriber for this strain.
    // Match against strain_slug OR a broader category. Per-recipient SES
    // calls (no BCC) so bounces resolve cleanly + unsubscribes are
    // individual.
    if (dbConfigured()) {
      try {
        const sql = getSql();
        const subs = (await sql`
          SELECT DISTINCT o.email
            FROM product_notification_subscribers s
            JOIN oglife_optins o ON o.id = s.optin_id
           WHERE s.is_active = true
             AND s.channel = 'email'
             AND (s.strain_slug = ${strain_slug} OR s.product_slug = ${strain_slug})
        `) as { email: string }[];
        for (const sub of subs) {
          sendTransactional({
            template: "strain-drop",
            to: sub.email,
            vars: {
              strain_name: strain_slug,
              strain_slug,
              headline,
              body,
            },
            related: { kind: "strain-drop", id: strain_slug },
          }).catch(() => {});
        }
      } catch {
        // non-fatal — push + SMS still went out
      }
    }
  }

  return NextResponse.redirect(
    new URL(`/strains/${encodeURIComponent(strain_slug)}?posted=1`, req.url),
    303,
  );
}

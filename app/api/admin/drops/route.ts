/**
 * POST /api/admin/drops
 *
 * Insert a current_drops row from the admin compose form. The IG ingester
 * uses the same shape via an internal call, but ALSO writes the source_url
 * so we don't dupe the same Instagram post.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";

const STATUSES = new Set(["live", "low-stock", "sold-out", "incoming"]);
const SOURCE_KINDS = new Set(["manual", "instagram", "weedmaps", "leafly", "nabis"]);

export async function POST(req: Request) {
  const form = await req.formData();
  const strain_slug = String(form.get("strain_slug") ?? "").trim() || null;
  const status = String(form.get("status") ?? "live");
  const source_kind = String(form.get("source_kind") ?? "manual");
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid-status" }, { status: 422 });
  }
  if (!SOURCE_KINDS.has(source_kind)) {
    return NextResponse.json({ error: "invalid-source-kind" }, { status: 422 });
  }
  const dispensary_name = String(form.get("dispensary_name") ?? "").trim() || null;
  if (!dispensary_name) {
    return NextResponse.json({ error: "dispensary-name-required" }, { status: 422 });
  }
  const dispensary_id = String(form.get("dispensary_id") ?? "").trim() || null;
  const city = String(form.get("city") ?? "").trim() || null;
  const state = String(form.get("state") ?? "").trim().toUpperCase() || null;
  const caption = String(form.get("caption") ?? "").trim() || null;
  const source_url = String(form.get("source_url") ?? "").trim() || null;
  const source_handle = String(form.get("source_handle") ?? "").trim() || null;
  const hero_image_url = String(form.get("hero_image_url") ?? "").trim() || null;

  if (!dbConfigured()) {
    return NextResponse.redirect(new URL("/drops?added=stub", req.url), 303);
  }
  try {
    const sql = getSql();
    await sql`
      INSERT INTO current_drops
        (strain_slug, dispensary_id, dispensary_name, city, state,
         status, source_kind, source_url, source_handle, hero_image_url,
         caption, drop_date)
      VALUES
        (${strain_slug}, ${dispensary_id}, ${dispensary_name}, ${city}, ${state},
         ${status}, ${source_kind}, ${source_url}, ${source_handle}, ${hero_image_url},
         ${caption}, ${new Date().toISOString().slice(0, 10)})
    `;
  } catch (err) {
    const detail = err instanceof Error ? err.message : "insert-failed";
    return NextResponse.json({ error: "insert-failed", detail }, { status: 500 });
  }
  return NextResponse.redirect(new URL("/drops?added=1", req.url), 303);
}

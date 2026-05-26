/**
 * Server helper for loading the current-drops feed.
 *
 * Reads from current_drops when the DB is configured; falls back to a
 * curated stub list so /drops + the homepage section render meaningfully
 * in preview without a DB.
 */

import { dbConfigured, getSql } from "@/lib/db";

export type CurrentDrop = {
  id: string;
  strain_slug: string | null;
  product_slug: string | null;
  dispensary_id: string | null;
  dispensary_name: string | null;
  city: string | null;
  state: string | null;
  status: "live" | "low-stock" | "sold-out" | "incoming";
  source_kind: "manual" | "instagram" | "weedmaps" | "leafly" | "nabis";
  source_url: string | null;
  source_handle: string | null;
  hero_image_url: string | null;
  caption: string | null;
  drop_date: string | null;
  added_at: string;
};

const PLACEHOLDER: CurrentDrop[] = [
  {
    id: "stub-1",
    strain_slug: "permanent-og",
    product_slug: null,
    dispensary_id: null,
    dispensary_name: "Example Dispensary — Oakland",
    city: "Oakland",
    state: "CA",
    status: "live",
    source_kind: "manual",
    source_url: null,
    source_handle: null,
    hero_image_url: null,
    caption: "Light-assist run on the shelf this week.",
    drop_date: null,
    added_at: new Date().toISOString(),
  },
  {
    id: "stub-2",
    strain_slug: "cheetah-piss",
    product_slug: null,
    dispensary_id: null,
    dispensary_name: "Example Dispensary — Sacramento",
    city: "Sacramento",
    state: "CA",
    status: "low-stock",
    source_kind: "manual",
    source_url: null,
    source_handle: null,
    hero_image_url: null,
    caption: "Cookies cross moving fast.",
    drop_date: null,
    added_at: new Date(Date.now() - 86400_000 * 2).toISOString(),
  },
  {
    id: "stub-3",
    strain_slug: "strawberry-lobster",
    product_slug: null,
    dispensary_id: null,
    dispensary_name: "Example Dispensary — Eureka",
    city: "Eureka",
    state: "CA",
    status: "incoming",
    source_kind: "instagram",
    source_url: "https://www.instagram.com/buckmountaincannabis/",
    source_handle: "@buckmountaincannabis",
    hero_image_url: null,
    caption: "Dispensary tagged the strain — drops next week.",
    drop_date: null,
    added_at: new Date(Date.now() - 86400_000 * 5).toISOString(),
  },
];

export async function loadCurrentDrops(limit = 40): Promise<{
  rows: CurrentDrop[];
  stub: boolean;
}> {
  if (!dbConfigured()) return { rows: PLACEHOLDER.slice(0, limit), stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        id::text         AS id,
        strain_slug,
        product_slug,
        dispensary_id,
        dispensary_name,
        city,
        state,
        status,
        source_kind,
        source_url,
        source_handle,
        hero_image_url,
        caption,
        drop_date,
        added_at
      FROM current_drops
     WHERE expires_at IS NULL OR expires_at > now()
     ORDER BY added_at DESC
     LIMIT ${limit}
    `) as CurrentDrop[];
    if (rows.length === 0) return { rows: PLACEHOLDER.slice(0, limit), stub: true };
    return { rows, stub: false };
  } catch {
    return { rows: PLACEHOLDER.slice(0, limit), stub: true };
  }
}

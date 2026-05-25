/**
 * Server helpers for loading strain_updates rows.
 *
 * The homepage + /strains/updates use the same shape. When the DB is
 * unwired (preview deploys), we return the placeholder set from
 * components/strain-updates.tsx so the section never goes empty.
 */

import { dbConfigured, getSql } from "@/lib/db";
import {
  PLACEHOLDER_UPDATES,
  type StrainUpdate,
} from "@/components/strain-updates";

type Row = {
  id: number;
  strain_slug: string | null;
  headline: string;
  body: string;
  kind: StrainUpdate["kind"];
  published_at: string;
};

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export async function loadStrainUpdates(limit = 6): Promise<StrainUpdate[]> {
  if (!dbConfigured()) return PLACEHOLDER_UPDATES.slice(0, limit);
  const sql = getSql();
  try {
    const rows = (await sql`
      SELECT
        u.id,
        u.strain_slug,
        u.headline,
        u.body,
        u.kind,
        u.published_at
      FROM strain_updates u
      WHERE u.is_published = true
      ORDER BY u.published_at DESC
      LIMIT ${limit}
    `) as Row[];
    if (rows.length === 0) return PLACEHOLDER_UPDATES.slice(0, limit);
    return rows.map((r) => ({
      id: `db-${r.id}`,
      headline: r.headline,
      strain_slug: r.strain_slug ?? "",
      strain_name: r.strain_slug ?? "",
      body: r.body,
      kind: r.kind,
      published_at: relative(r.published_at),
    }));
  } catch {
    return PLACEHOLDER_UPDATES.slice(0, limit);
  }
}

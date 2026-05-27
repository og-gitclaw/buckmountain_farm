/**
 * POST /api/admin/assets
 *
 * Receives asset records from the openclaw media watcher.
 * One record per file. Upsert by sha256 (idempotent).
 *
 * Auth: Bearer ADMIN_ASSET_INGEST_TOKEN.
 *
 * Persistence: upserts into `assets` by sha256. If the DB isn't wired
 * (preview deploys), we still 202 so the watcher doesn't queue forever.
 */

import { NextResponse } from "next/server";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";

type AssetRecord = {
  id: string;
  schema: string;
  sha256: string;
  source: {
    host: string;
    user: string;
    abs_path: string;
    rel_path: string;
    bucket: string;
    route: "trusted" | "cross-folder-match";
  };
  file: {
    name: string;
    ext: string;
    size_bytes: number;
    mtime_iso: string;
  };
  kind: "image" | "video" | "other";
  tags: string[];
  ingested_at_iso: string;
  watcher_version: string;
};

function isValidRecord(x: unknown): x is AssetRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.sha256 === "string" &&
    typeof r.schema === "string" &&
    r.schema === "buckmountain-farm/asset/v1" &&
    typeof r.source === "object" &&
    r.source !== null &&
    typeof r.file === "object" &&
    r.file !== null
  );
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_ASSET_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "server-misconfigured", detail: "ADMIN_ASSET_INGEST_TOKEN not set" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!isValidRecord(body)) {
    return NextResponse.json({ error: "invalid-record-shape" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      {
        ok: true,
        id: body.id,
        received_at: new Date().toISOString(),
        missing: { db_row: true },
        stub: "db-not-configured",
      },
      { status: 202 },
    );
  }

  const sql = getSql();
  const stored = (await sql`
    INSERT INTO assets (
      id, sha256, kind, bucket, route, file_name, file_ext,
      size_bytes, mtime, tags, source_host, source_path
    )
    VALUES (
      ${body.id}, ${body.sha256}, ${body.kind}, ${body.source.bucket},
      ${body.source.route}, ${body.file.name}, ${body.file.ext},
      ${body.file.size_bytes}, ${body.file.mtime_iso}, ${body.tags},
      ${body.source.host}, ${body.source.abs_path}
    )
    ON CONFLICT (sha256) DO UPDATE SET
      tags        = EXCLUDED.tags,
      file_name   = EXCLUDED.file_name,
      source_path = EXCLUDED.source_path,
      mtime       = EXCLUDED.mtime
    RETURNING id, review_status, blob_url
  `) as { id: string; review_status: string; blob_url: string | null }[];

  return NextResponse.json(
    {
      ok: true,
      id: stored[0].id,
      received_at: new Date().toISOString(),
      review_status: stored[0].review_status,
      missing: {
        blob_url: !stored[0].blob_url,
        thumbnail: !stored[0].blob_url,
      },
    },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      service: "buckmountain.farm/api/admin/assets",
      method: "POST",
      schema: "buckmountain-farm/asset/v1",
    },
    { status: 200 },
  );
}

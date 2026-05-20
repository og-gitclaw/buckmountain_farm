/**
 * POST /api/admin/assets
 *
 * Receives asset records from the openclaw media watcher
 * (scripts/openclaw_watcher.py). One record per file.
 *
 * Auth: Bearer token. The watcher sets BUCKMOUNTAIN_DASHBOARD_TOKEN; here
 * we compare against process.env.ADMIN_ASSET_INGEST_TOKEN.
 *
 * Persistence: TODO P2. For now we just log + acknowledge so the watcher
 * stops queuing. Once the Neon schema lands (db/schema.sql), this endpoint
 * upserts into `assets` by sha256 (idempotent).
 */

import { NextResponse } from "next/server";

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
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
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

  // TODO(P2): upsert into Neon `assets` table by sha256.
  // TODO(P2): if !blob_url, fetch the file from openclaw via Tailscale and stage to Vercel Blob.
  console.log("[assets:ingest]", {
    id: body.id,
    sha256: body.sha256,
    bucket: body.source.bucket,
    route: body.source.route,
    kind: body.kind,
    tags: body.tags,
    name: body.file.name,
    size: body.file.size_bytes,
  });

  return NextResponse.json(
    {
      ok: true,
      id: body.id,
      received_at: new Date().toISOString(),
      // Hints back to the watcher about what we still need.
      missing: { blob_url: true, thumbnail: true, db_row: true },
    },
    { status: 202 },
  );
}

export async function GET() {
  return NextResponse.json(
    { service: "buckmountain.farm/api/admin/assets", method: "POST", schema: "buckmountain-farm/asset/v1" },
    { status: 200 },
  );
}

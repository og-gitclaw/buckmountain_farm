/**
 * /admin/assets — what the openclaw watcher has ingested.
 *
 * Reads assets ordered by ingested_at DESC. Stub fallback when DB
 * isn't configured. Auth gate is TODO — currently behind Vercel
 * Deployment Protection only.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const revalidate = 30;

type Row = {
  id: string;
  bucket: string;
  route: string;
  kind: string;
  tags: string[];
  file_name: string;
  size_bytes: number;
  review_status: string;
  blob_url: string | null;
  ingested_at: string;
};

async function loadAssets(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: [], stub: true };
  const sql = getSql();
  const rows = (await sql`
    SELECT id, bucket, route, kind, tags, file_name, size_bytes,
           review_status, blob_url, ingested_at
      FROM assets
     ORDER BY ingested_at DESC
     LIMIT 100
  `) as Row[];
  return { rows, stub: false };
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default async function AdminAssetsPage() {
  const { rows, stub } = await loadAssets();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-6xl mx-auto mb-4 text-sm">
        <Link href="/admin" className="text-sky-400 hover:underline">← Admin</Link>
      </nav>
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Asset dashboard</h1>
        <p className="text-neutral-400 mt-2">
          Files routed here from the <code>openclaw media ingestor</code> →
          buckmountain bucket. Polls every 30s.
        </p>
      </header>

      <section className="max-w-6xl mx-auto">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <p className="text-neutral-500 italic">
              No assets ingested yet.{" "}
              {stub
                ? "DB not configured here — preview shows empty state."
                : "Once the watcher is running on openclaw, records appear here within ~30s."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left">
                <tr className="border-b border-neutral-800">
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4">Kind</th>
                  <th className="py-3 px-4">Bucket</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ingested</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                    <td className="py-3 px-4 truncate max-w-[280px]" title={r.file_name}>
                      {r.blob_url ? (
                        <a href={r.blob_url} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                          {r.file_name}
                        </a>
                      ) : (
                        r.file_name
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">{r.kind}</td>
                    <td className="py-3 px-4 text-neutral-400">{r.bucket}</td>
                    <td className="py-3 px-4 text-neutral-400 text-xs">
                      {r.tags?.join(", ") || "—"}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">{humanSize(r.size_bytes)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          r.review_status === "approved"
                            ? "text-emerald-300"
                            : r.review_status === "rejected"
                              ? "text-rose-300"
                              : "text-amber-300"
                        }
                      >
                        {r.review_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {new Date(r.ingested_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-sm">
          <h2 className="font-semibold mb-2">Watcher status</h2>
          <ul className="space-y-1 font-mono text-neutral-400">
            <li>host: Joshuas-Mac-mini.local</li>
            <li>script: /Users/iamclaw/Library/Application Support/buckmountain-farm/openclaw_watcher.py</li>
            <li>plist: ~/Library/LaunchAgents/com.buckmountain.farm.media-watcher.plist</li>
            <li>log: ~/Library/Logs/buckmountain-farm-watcher.log</li>
            <li>manifest: ~/Library/Application Support/buckmountain-farm/manifest.jsonl</li>
            <li>poll: 30s</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

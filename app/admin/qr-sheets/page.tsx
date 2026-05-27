/**
 * /admin/qr-sheets — ingested print sheets + token counts.
 *
 * Reads qr_sheets joined to COUNT(qr_tokens) for live counts. Falls back
 * to a stub row when the DB isn't wired.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: number;
  sheet_code: string | null;
  printer: string | null;
  token_count: number;
  scanned_count: number;
  ingested_at: string;
};

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) {
    return {
      stub: true,
      rows: [
        { id: -1, sheet_code: "BMC-2026-W21-A03", printer: "photoshop-team", token_count: 60, scanned_count: 0, ingested_at: "2026-05-22T00:00:00Z" },
      ],
    };
  }
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        s.id,
        s.sheet_code,
        s.printer,
        s.token_count,
        (SELECT COUNT(*)::int FROM qr_scans sc
          JOIN qr_tokens t ON t.token = sc.token
          WHERE t.sheet_id = s.id) AS scanned_count,
        s.ingested_at
      FROM qr_sheets s
      ORDER BY s.ingested_at DESC
      LIMIT 100
    `) as Row[];
    return { rows, stub: false };
  } catch {
    return { rows: [], stub: true };
  }
}

export default async function QrSheets() {
  const { rows, stub } = await loadRows();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-5xl mx-auto mb-4 text-sm">
        <Link href="/admin" className="text-sky-400 hover:underline">← Admin</Link>
      </nav>
      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">QR sheets</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Ingested via openclaw watcher · authenticity-only v1
          </p>
        </div>
        <Link
          href="/agent/qr/request"
          className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold"
        >
          + Allocate tokens
        </Link>
      </header>
      <section className="max-w-5xl mx-auto">
        {rows.length === 0 ? (
          <p className="text-neutral-500 italic">
            No sheets ingested yet. Run the Photoshop → openclaw watcher pipeline
            (see <code>handoff/QR_STICKER_WORKFLOW.md</code>).
          </p>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left">
                <tr className="border-b border-neutral-800">
                  <th className="py-3 px-4">Sheet code</th>
                  <th className="py-3 px-4">Tokens</th>
                  <th className="py-3 px-4">Scanned</th>
                  <th className="py-3 px-4">Printer</th>
                  <th className="py-3 px-4">Ingested</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                    <td className="py-3 px-4 font-mono text-xs">{r.sheet_code ?? "—"}</td>
                    <td className="py-3 px-4">{r.token_count}</td>
                    <td className="py-3 px-4 text-neutral-400">{r.scanned_count}</td>
                    <td className="py-3 px-4 text-neutral-400">{r.printer ?? "—"}</td>
                    <td className="py-3 px-4 text-neutral-400">
                      {new Date(r.ingested_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {stub && (
          <p className="mt-4 text-xs text-neutral-600 italic">
            DB not configured here — showing stub row.
          </p>
        )}
      </section>
    </main>
  );
}

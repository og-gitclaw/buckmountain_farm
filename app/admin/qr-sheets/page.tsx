/**
 * /admin/qr-sheets — list of ingested QR sheets + their token counts.
 *
 * Source: qr_sheets joined to count(qr_tokens). Stub list until DB lands.
 */

import Link from "next/link";

const STUB_ROWS = [
  { sheet_code: "BMC-2026-W21-A03", count: 60, ingested_at: "2026-05-22", printer: "photoshop-team" },
  { sheet_code: "BMC-2026-W20-A01", count: 75, ingested_at: "2026-05-14", printer: "photoshop-team" },
];

export default function QrSheets() {
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
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-neutral-500 text-left">
              <tr className="border-b border-neutral-800">
                <th className="py-3 px-4">Sheet code</th>
                <th className="py-3 px-4">Tokens</th>
                <th className="py-3 px-4">Printer</th>
                <th className="py-3 px-4">Ingested</th>
              </tr>
            </thead>
            <tbody>
              {STUB_ROWS.map((r) => (
                <tr key={r.sheet_code} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                  <td className="py-3 px-4 font-mono text-xs">{r.sheet_code}</td>
                  <td className="py-3 px-4">{r.count}</td>
                  <td className="py-3 px-4 text-neutral-400">{r.printer}</td>
                  <td className="py-3 px-4 text-neutral-400">{r.ingested_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-neutral-600 italic">
          Stub rows. Replace with `SELECT s.*, COUNT(t.token) FROM qr_sheets s LEFT JOIN qr_tokens t ON t.sheet_id = s.id GROUP BY s.id` once Neon lands.
        </p>
      </section>
    </main>
  );
}

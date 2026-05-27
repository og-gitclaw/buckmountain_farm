/**
 * /agent/loyalty — QR scan activity, grouped by region.
 *
 * No precise dispensary join yet (qr_scans only has IP-derived geo, no
 * direct dispensary FK) — for now aggregate by geo_city. Once we add
 * a join from IP geo → nearest dispensary radius, this graduates to
 * the per-store view it really wants to be.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  geo_city: string | null;
  geo_country: string | null;
  scans_7d: number;
  top_strain: string | null;
};

const STUBS: Row[] = [
  { geo_city: "Oakland",    geo_country: "US", scans_7d: 12, top_strain: "Permanent OG" },
  { geo_city: "Sacramento", geo_country: "US", scans_7d: 4,  top_strain: "Gelato 41" },
];

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: STUBS, stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
    SELECT
      s.geo_city,
      s.geo_country,
      COUNT(*)::int AS scans_7d,
      (
        SELECT p.name
          FROM qr_scans s2
          JOIN qr_tokens t  ON t.token = s2.token
          JOIN batches   b  ON b.id    = t.batch_id
          JOIN products  p  ON p.id    = b.product_id
         WHERE s2.geo_city IS NOT DISTINCT FROM s.geo_city
           AND s2.scanned_at > now() - interval '7 days'
         GROUP BY p.name
         ORDER BY COUNT(*) DESC
         LIMIT 1
      ) AS top_strain
    FROM qr_scans s
    WHERE s.scanned_at > now() - interval '7 days'
    GROUP BY s.geo_city, s.geo_country
    ORDER BY scans_7d DESC
    LIMIT 50
  `) as Row[];
    return { rows, stub: false };
  } catch {
    return { rows: STUBS, stub: true };
  }
}

export default async function AgentLoyalty() {
  const { rows, stub } = await loadRows();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-5xl mx-auto mb-4 text-sm">
        <Link href="/agent" className="text-sky-400 hover:underline">← Agent home</Link>
      </nav>
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Loyalty scans</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Last 7 days · grouped by scanner geo (city-level)
        </p>
      </header>
      <section className="max-w-5xl mx-auto">
        {rows.length === 0 ? (
          <p className="text-neutral-500 italic">No scans in the last 7 days.</p>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left">
                <tr className="border-b border-neutral-800">
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Scans</th>
                  <th className="py-3 px-4">Top strain</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                    <td className="py-3 px-4 font-semibold">{r.geo_city ?? "—"}</td>
                    <td className="py-3 px-4 text-neutral-400">{r.geo_country ?? "—"}</td>
                    <td className="py-3 px-4">{r.scans_7d}</td>
                    <td className="py-3 px-4 text-neutral-400">{r.top_strain ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {stub && (
          <p className="mt-4 text-xs text-neutral-600 italic">
            DB not configured here — showing stub rows.
          </p>
        )}
      </section>
    </main>
  );
}

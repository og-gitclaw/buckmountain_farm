/**
 * /agent/loyalty — QR scan activity, grouped by dispensary.
 *
 * Lets a rep see which of their stores are generating the most scans
 * (= customers actually picking jars off the shelf). Useful for
 * conversation: "Permanent OG is moving — want to reorder?"
 *
 * Data path (P3): qr_scans joined to qr_tokens.batch_id → batches →
 * products, geo-filtered to dispensaries within radius of each scan's
 * IP-derived location. For now: stub.
 */

import Link from "next/link";

const STUB = [
  { dispensary_id: "stub-1", dispensary_name: "Example Dispensary A", city: "Oakland", scans_7d: 12, top_strain: "Permanent OG" },
  { dispensary_id: "stub-2", dispensary_name: "Example Dispensary B", city: "Sacramento", scans_7d: 4, top_strain: "Gelato 41" },
];

export default function AgentLoyalty() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-5xl mx-auto mb-4 text-sm">
        <Link href="/agent" className="text-sky-400 hover:underline">← Agent home</Link>
      </nav>
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Loyalty scans by store</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Last 7 days · which lids are getting popped where
        </p>
      </header>
      <section className="max-w-5xl mx-auto">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-neutral-500 text-left">
              <tr className="border-b border-neutral-800">
                <th className="py-3 px-4">Dispensary</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Scans</th>
                <th className="py-3 px-4">Top strain</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {STUB.map((r) => (
                <tr key={r.dispensary_id} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                  <td className="py-3 px-4 font-semibold">{r.dispensary_name}</td>
                  <td className="py-3 px-4 text-neutral-400">{r.city}</td>
                  <td className="py-3 px-4">{r.scans_7d}</td>
                  <td className="py-3 px-4 text-neutral-400">{r.top_strain}</td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/agent/dispensaries/${r.dispensary_id}`}
                      className="text-sky-400 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-neutral-600 italic">
          Stub rows. Replace with the qr_scans aggregation query once Neon lands.
        </p>
      </section>
    </main>
  );
}

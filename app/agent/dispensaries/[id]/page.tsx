/**
 * /agent/dispensaries/[id] — single account view.
 *
 * Surfaces:
 *   - Contact info + license # + buyer
 *   - Recent Nabis orders (via nabis_sync cache)
 *   - Visit log (most recent first)
 *   - QR-scan trail at this store (which jar lids got scanned, by whom, when)
 *   - Quick actions: file visit, push new-product notif to buyer
 */

import Link from "next/link";

export default async function DispensaryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <nav className="max-w-6xl mx-auto mb-4 text-sm">
        <Link href="/agent/dispensaries" className="text-sky-400 hover:underline">
          ← Dispensaries
        </Link>
      </nav>

      <header className="max-w-6xl mx-auto mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Dispensary · {id}</h1>
          <p className="text-neutral-400 text-sm mt-1">
            CDPH license · primary buyer · last visit
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/agent/visit-report?dispensary=${encodeURIComponent(id)}`}
            className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold"
          >
            File visit
          </Link>
          <Link
            href={`/agent/notifications?dispensary=${encodeURIComponent(id)}`}
            className="rounded-md border border-neutral-700 px-3 py-2 text-sm"
          >
            Send new-product blast
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
        <Block title="Recent Nabis orders">
          <p className="text-neutral-500 italic text-sm">
            (Live pull from /api/nabis/orders?dispensary={id}.) Stubbed until Nabis API
            key arrives — see handoff/NABIS_API_SETUP.md.
          </p>
        </Block>
        <Block title="Visit log">
          <p className="text-neutral-500 italic text-sm">
            (Most recent visit_reports for this dispensary.)
          </p>
        </Block>
        <Block title="QR scans at this store">
          <p className="text-neutral-500 italic text-sm">
            (qr_scans joined to qr_tokens.batch_id → batches.product_id, filtered by
            geo within store radius.)
          </p>
        </Block>
        <Block title="Menu placement audit">
          <p className="text-neutral-500 italic text-sm">
            (Latest Weedmaps / Leafly screenshot + scrape result.)
          </p>
        </Block>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

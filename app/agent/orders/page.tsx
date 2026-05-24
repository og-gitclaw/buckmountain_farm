/**
 * /agent/orders — live Nabis order pipeline view for field agents.
 *
 * Pulls from /api/nabis/orders. Once Nabis API key is set, this surfaces
 * real records. Until then, returns skipped:true and we render the
 * empty-state instructions linking to handoff/NABIS_API_SETUP.md.
 */

import Link from "next/link";

async function getOrders() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/nabis/orders`,
      { cache: "no-store" },
    );
    return res.json();
  } catch {
    return { ok: false, skipped: true, reason: "fetch-failed", orders: [] };
  }
}

export default async function AgentOrders() {
  const data = await getOrders();
  const skipped = data?.skipped === true;
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <nav className="max-w-6xl mx-auto mb-4 text-sm">
        <Link href="/agent" className="text-sky-400 hover:underline">← Agent home</Link>
      </nav>
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Nabis Orders</h1>
        <p className="text-neutral-400 text-sm mt-1">Last 30 days · live pull</p>
      </header>
      <section className="max-w-6xl mx-auto">
        {skipped ? (
          <div className="rounded-lg border border-amber-900/40 bg-amber-900/10 p-6">
            <p className="text-amber-300 font-semibold">Nabis API not yet wired.</p>
            <p className="text-neutral-400 text-sm mt-2">
              Cultivator needs to follow{" "}
              <code>handoff/NABIS_API_SETUP.md</code> and forward the API key.
              Once <code>NABIS_API_KEY</code> is set in Vercel env, this page
              starts showing live records.
            </p>
          </div>
        ) : (
          <p className="text-neutral-500 italic">Orders table — TODO render rows.</p>
        )}
      </section>
    </main>
  );
}

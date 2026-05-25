/**
 * /admin/orders — full Nabis pipeline view, all dispensaries, all reps.
 *
 * Same data source as /agent/orders but unscoped (admin sees everything).
 * Shows skipped state if Nabis API key isn't set yet.
 */

import Link from "next/link";

async function getOrders() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/nabis/orders?limit=200`,
      {
        cache: "no-store",
        headers: process.env.ADMIN_API_TOKEN
          ? { authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
          : {},
      },
    );
    return res.json();
  } catch {
    return { ok: false, skipped: true, reason: "fetch-failed", orders: [] };
  }
}

export default async function AdminOrders() {
  const data = await getOrders();
  const skipped = data?.skipped === true;
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-6xl mx-auto mb-4 text-sm">
        <Link href="/admin" className="text-sky-400 hover:underline">← Admin</Link>
      </nav>
      <header className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">All Nabis orders</h1>
        <p className="text-neutral-400 text-sm mt-1">Last 30 days · admin-scope · live pull</p>
      </header>
      <section className="max-w-6xl mx-auto">
        {skipped ? (
          <div className="rounded-lg border border-amber-900/40 bg-amber-900/10 p-6">
            <p className="text-amber-300 font-semibold">Nabis API not yet wired.</p>
            <p className="text-neutral-400 text-sm mt-2">
              See <code>handoff/NABIS_API_SETUP.md</code>. Once <code>NABIS_API_KEY</code> is set,
              this page populates automatically.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <p className="text-neutral-500 italic">No orders returned in the window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-2">Order</th>
                  <th className="py-3 px-2">Buyer</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Total</th>
                  <th className="py-3 px-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: { id: string; number: string; status: string; buyer?: { name?: string }; total?: number; created_at: string }) => (
                  <tr key={o.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                    <td className="py-2 px-2 font-semibold">#{o.number}</td>
                    <td className="py-2 px-2">{o.buyer?.name ?? "—"}</td>
                    <td className="py-2 px-2 text-neutral-400">{o.status}</td>
                    <td className="py-2 px-2">{o.total != null ? `$${o.total.toLocaleString()}` : "—"}</td>
                    <td className="py-2 px-2 text-neutral-400">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

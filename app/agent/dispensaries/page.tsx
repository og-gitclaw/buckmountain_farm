/**
 * /agent/dispensaries — list of dispensaries.
 *
 * For now shows ALL dispensaries (filter by agent_id once SSO seeds
 * agents table on first sign-in — P4). Stub rows if DB isn't wired.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  name: string;
  city: string | null;
  state: string;
  status: string;
  last_order_at: string | null;
};

const STUBS: Row[] = [
  { id: "stub-1", name: "Example Dispensary A", city: "Oakland", state: "CA", status: "active", last_order_at: "2026-05-12" },
  { id: "stub-2", name: "Example Dispensary B", city: "Sacramento", state: "CA", status: "lapsed", last_order_at: "2026-02-04" },
  { id: "stub-3", name: "Example Dispensary C", city: "Eureka", state: "CA", status: "lead", last_order_at: null },
];

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: STUBS, stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, city, state, status, last_order_at
        FROM dispensaries
       ORDER BY last_order_at DESC NULLS LAST, name
       LIMIT 200
    `) as Row[];
    return { rows, stub: false };
  } catch {
    return { rows: STUBS, stub: true };
  }
}

export default async function DispensariesList() {
  const { rows, stub } = await loadRows();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispensaries</h1>
          <p className="text-neutral-400 text-sm mt-1">
            All accounts · sorted by last order
          </p>
        </div>
        <Link
          href="/agent/dispensaries/new"
          className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold"
        >
          + Add lead
        </Link>
      </header>

      <section className="max-w-6xl mx-auto overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-neutral-500 italic">No dispensaries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-neutral-500 text-left border-b border-neutral-800">
              <tr>
                <th className="py-3 px-2">Name</th>
                <th className="py-3 px-2">City</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Last order</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                  <td className="py-3 px-2 font-semibold">{row.name}</td>
                  <td className="py-3 px-2 text-neutral-400">
                    {row.city ?? "—"}, {row.state}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={
                        row.status === "active"
                          ? "text-emerald-400"
                          : row.status === "lapsed"
                            ? "text-amber-400"
                            : row.status === "dropped"
                              ? "text-white/40"
                              : "text-sky-400"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-neutral-400">
                    {row.last_order_at ? new Date(row.last_order_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Link
                      href={`/agent/dispensaries/${row.id}`}
                      className="text-sky-400 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {stub && (
        <p className="max-w-6xl mx-auto mt-6 text-xs text-neutral-600 italic">
          DB not configured here — showing stub rows.
        </p>
      )}
    </main>
  );
}

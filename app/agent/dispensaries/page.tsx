/**
 * /agent/dispensaries — list of dispensaries assigned to the logged-in agent.
 *
 * Data shape comes from the `dispensaries` table joined with
 * `agent_dispensary_assignments`. See db/schema.sql for columns.
 *
 * Stubbed list below — once Neon is wired, replace the hardcoded array
 * with a server-side query scoped to the session's agent_id.
 */

import Link from "next/link";

type Row = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: "active" | "lapsed" | "lead";
  last_order_at: string | null;
};

const STUB_ROWS: Row[] = [
  { id: "stub-1", name: "Example Dispensary A", city: "Oakland", state: "CA", status: "active", last_order_at: "2026-05-12" },
  { id: "stub-2", name: "Example Dispensary B", city: "Sacramento", state: "CA", status: "lapsed", last_order_at: "2026-02-04" },
  { id: "stub-3", name: "Example Dispensary C", city: "Eureka", state: "CA", status: "lead", last_order_at: null },
];

export default function DispensariesList() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispensaries</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Your assigned accounts · sorted by last order
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
            {STUB_ROWS.map((row) => (
              <tr key={row.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                <td className="py-3 px-2 font-semibold">{row.name}</td>
                <td className="py-3 px-2 text-neutral-400">
                  {row.city}, {row.state}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={
                      row.status === "active"
                        ? "text-emerald-400"
                        : row.status === "lapsed"
                        ? "text-amber-400"
                        : "text-sky-400"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="py-3 px-2 text-neutral-400">
                  {row.last_order_at ?? "—"}
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
      </section>

      <p className="max-w-6xl mx-auto mt-6 text-xs text-neutral-600 italic">
        Stub data. Replace with Neon query once db is provisioned + assignments seeded.
      </p>
    </main>
  );
}

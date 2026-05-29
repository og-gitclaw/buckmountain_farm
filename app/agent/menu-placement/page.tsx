/**
 * /agent/menu-placement — Weedmaps / Leafly menu-placement audit.
 *
 * Reads dispensaries and flags, per store, which online menus we have a
 * link for (Weedmaps / Leafly / house menu) and which are missing. This
 * is the audit surface a rep works down: "who carries us but isn't listed
 * online" is where placement (and reorders) leak.
 *
 * Read-only for now — the actual listed/not-listed verification is a
 * manual check the rep does by opening each menu link (a future openclaw
 * scrape can populate a real `menu_listings` table; this page is the
 * scaffold + the link launcher). Links open in a new tab.
 *
 * force-dynamic + try/catch + stub fallback, same posture as the other
 * DB-touching agent pages so a schema lag or missing DB never 500s.
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
  weedmaps_url: string | null;
  leafly_url: string | null;
  menu_url: string | null;
};

const STUBS: Row[] = [
  {
    id: "stub-1",
    name: "Example Dispensary A",
    city: "Oakland",
    state: "CA",
    status: "active",
    weedmaps_url: "https://weedmaps.com/dispensaries/example-a",
    leafly_url: null,
    menu_url: null,
  },
  {
    id: "stub-2",
    name: "Example Dispensary B",
    city: "Sacramento",
    state: "CA",
    status: "active",
    weedmaps_url: null,
    leafly_url: null,
    menu_url: null,
  },
  {
    id: "stub-3",
    name: "Example Dispensary C",
    city: "Eureka",
    state: "CA",
    status: "lapsed",
    weedmaps_url: "https://weedmaps.com/dispensaries/example-c",
    leafly_url: "https://leafly.com/dispensary-info/example-c",
    menu_url: "https://example-c.com/menu",
  },
];

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: STUBS, stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, name, city, state, status, weedmaps_url, leafly_url, menu_url
        FROM dispensaries
       WHERE status IN ('active', 'lapsed')
       ORDER BY status, name
       LIMIT 200
    `) as Row[];
    return { rows, stub: false };
  } catch {
    return { rows: STUBS, stub: true };
  }
}

function coverage(r: Row): number {
  return [r.weedmaps_url, r.leafly_url, r.menu_url].filter(Boolean).length;
}

export default async function MenuPlacementAudit() {
  const { rows, stub } = await loadRows();

  // Worst coverage first — those are the stores to chase.
  const sorted = [...rows].sort((a, b) => coverage(a) - coverage(b));
  const gaps = sorted.filter((r) => coverage(r) < 3).length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Menu Placement</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Where Buck is listed online · active + lapsed accounts ·
            incomplete listings first
          </p>
        </div>
        <Link href="/agent" className="text-sm text-neutral-400 hover:text-white">
          ← Agent portal
        </Link>
      </header>

      <section className="max-w-6xl mx-auto">
        <p className="text-sm text-neutral-400 mb-4">
          {gaps} of {sorted.length} accounts have at least one missing menu
          link. Open each link to verify Buck Mountain SKUs are actually
          listed — missing links are placement gaps to chase.
        </p>

        {sorted.length === 0 ? (
          <p className="text-neutral-500 italic">No active accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-2">Dispensary</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-center">Weedmaps</th>
                  <th className="py-3 px-2 text-center">Leafly</th>
                  <th className="py-3 px-2 text-center">House menu</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-neutral-900 hover:bg-neutral-900/40"
                  >
                    <td className="py-3 px-2">
                      <span className="font-semibold">{row.name}</span>
                      <span className="text-neutral-500">
                        {" "}
                        · {row.city ?? "—"}, {row.state}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={
                          row.status === "active"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <MenuCell url={row.weedmaps_url} label="Weedmaps" />
                    <MenuCell url={row.leafly_url} label="Leafly" />
                    <MenuCell url={row.menu_url} label="House menu" />
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
          </div>
        )}
      </section>

      {stub && (
        <p className="max-w-6xl mx-auto mt-6 text-xs text-neutral-600 italic">
          DB not configured in this environment — showing example rows.
        </p>
      )}
    </main>
  );
}

function MenuCell({ url, label }: { url: string | null; label: string }) {
  return (
    <td className="py-3 px-2 text-center">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline"
          aria-label={`Open ${label} listing`}
        >
          ✓ view
        </a>
      ) : (
        <span className="text-rose-400/80" aria-label={`No ${label} link`}>
          — missing
        </span>
      )}
    </td>
  );
}

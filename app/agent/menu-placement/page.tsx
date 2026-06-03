/**
 * /agent/menu-placement — Weedmaps / Leafly menu-placement audit.
 *
 * Per store, shows whether Buck Mountain SKUs are actually listed on each
 * online menu (Weedmaps / Leafly / house). Verified state comes from
 * menu_listings, populated by scripts/audit-menu-placement.mjs (headless
 * Chromium on openclaw → POST /api/agent/menu-placement). When a store
 * has a menu link but no audit row yet, we show "link, unchecked"; when
 * it has neither, "no link" — both are placement gaps for a rep to chase.
 *
 * force-dynamic + try/catch + stub fallback, same posture as the other
 * DB-touching agent pages so a schema lag or missing DB never 500s.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Platform = "weedmaps" | "leafly" | "house";

type Listing = {
  listed: boolean;
  match_count: number;
  checked_at: string;
  error: string | null;
} | null;

type Row = {
  id: string;
  name: string;
  city: string | null;
  state: string;
  status: string;
  weedmaps_url: string | null;
  leafly_url: string | null;
  menu_url: string | null;
  weedmaps: Listing;
  leafly: Listing;
  house: Listing;
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
    weedmaps: { listed: true, match_count: 3, checked_at: "2026-05-28T00:00:00Z", error: null },
    leafly: null,
    house: null,
  },
  {
    id: "stub-2",
    name: "Example Dispensary B",
    city: "Sacramento",
    state: "CA",
    status: "active",
    weedmaps_url: "https://weedmaps.com/dispensaries/example-b",
    leafly_url: null,
    menu_url: null,
    weedmaps: { listed: false, match_count: 0, checked_at: "2026-05-28T00:00:00Z", error: null },
    leafly: null,
    house: null,
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
    weedmaps: { listed: true, match_count: 2, checked_at: "2026-05-28T00:00:00Z", error: null },
    leafly: { listed: false, match_count: 0, checked_at: "2026-05-28T00:00:00Z", error: null },
    house: null,
  },
];

type DbRow = Omit<Row, "weedmaps" | "leafly" | "house"> & {
  listings: {
    platform: Platform;
    listed: boolean;
    match_count: number;
    checked_at: string;
    error: string | null;
  }[];
};

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: STUBS, stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        d.id, d.name, d.city, d.state, d.status,
        d.weedmaps_url, d.leafly_url, d.menu_url,
        COALESCE(
          json_agg(
            json_build_object(
              'platform', m.platform,
              'listed', m.listed,
              'match_count', m.match_count,
              'checked_at', m.checked_at,
              'error', m.error
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) AS listings
      FROM dispensaries d
      LEFT JOIN menu_listings m ON m.dispensary_id = d.id
      WHERE d.status IN ('active', 'lapsed')
      GROUP BY d.id
      ORDER BY d.status, d.name
      LIMIT 200
    `) as DbRow[];

    const mapped: Row[] = rows.map((d) => {
      const byPlatform = (p: Platform): Listing => {
        const hit = d.listings.find((l) => l.platform === p);
        return hit
          ? { listed: hit.listed, match_count: hit.match_count, checked_at: hit.checked_at, error: hit.error }
          : null;
      };
      return {
        id: d.id,
        name: d.name,
        city: d.city,
        state: d.state,
        status: d.status,
        weedmaps_url: d.weedmaps_url,
        leafly_url: d.leafly_url,
        menu_url: d.menu_url,
        weedmaps: byPlatform("weedmaps"),
        leafly: byPlatform("leafly"),
        house: byPlatform("house"),
      };
    });
    return { rows: mapped, stub: false };
  } catch {
    return { rows: STUBS, stub: true };
  }
}

// Rank for "needs attention" sort: confirmed-not-listed and unchecked
// links are worse than confirmed-listed.
function gapScore(url: string | null, l: Listing): number {
  if (l) return l.listed ? 0 : 3; // checked: listed=good, not-listed=worst
  if (url) return 2; // link present but never audited
  return 1; // no link at all
}

function storeScore(r: Row): number {
  return (
    gapScore(r.weedmaps_url, r.weedmaps) +
    gapScore(r.leafly_url, r.leafly) +
    gapScore(r.menu_url, r.house)
  );
}

export default async function MenuPlacementAudit() {
  const { rows, stub } = await loadRows();
  const sorted = [...rows].sort((a, b) => storeScore(b) - storeScore(a));
  const notListed = sorted.filter(
    (r) =>
      (r.weedmaps && !r.weedmaps.listed) ||
      (r.leafly && !r.leafly.listed) ||
      (r.house && !r.house.listed),
  ).length;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Menu Placement</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Where Buck is listed online · active + lapsed accounts ·
            needs-attention first
          </p>
        </div>
        <Link href="/agent" className="text-sm text-neutral-400 hover:text-white">
          ← Agent portal
        </Link>
      </header>

      <section className="max-w-6xl mx-auto">
        <p className="text-sm text-neutral-400 mb-4">
          {notListed} of {sorted.length} accounts have a menu where Buck
          wasn&rsquo;t found on the last audit. Placement state comes from the
          openclaw scraper (<code>scripts/audit-menu-placement.mjs</code>);
          &ldquo;unchecked&rdquo; means we have a link but haven&rsquo;t audited
          it yet.
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
                    <MenuCell url={row.weedmaps_url} listing={row.weedmaps} />
                    <MenuCell url={row.leafly_url} listing={row.leafly} />
                    <MenuCell url={row.menu_url} listing={row.house} />
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

function MenuCell({ url, listing }: { url: string | null; listing: Listing }) {
  // Confirmed listed
  if (listing && listing.listed) {
    return (
      <td className="py-3 px-2 text-center">
        <a
          href={url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
          title={`${listing.match_count} match(es) · checked ${new Date(listing.checked_at).toLocaleDateString()}`}
        >
          ✓ listed
        </a>
      </td>
    );
  }
  // Confirmed NOT listed (audited, no match)
  if (listing && !listing.listed) {
    return (
      <td className="py-3 px-2 text-center">
        <a
          href={url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-rose-400 hover:underline"
          title={
            listing.error
              ? `audit error: ${listing.error}`
              : `not found · checked ${new Date(listing.checked_at).toLocaleDateString()}`
          }
        >
          ✗ not listed
        </a>
      </td>
    );
  }
  // Have a link but never audited
  if (url) {
    return (
      <td className="py-3 px-2 text-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400/80 hover:underline"
        >
          link · unchecked
        </a>
      </td>
    );
  }
  // No link
  return (
    <td className="py-3 px-2 text-center">
      <span className="text-neutral-600">— no link</span>
    </td>
  );
}

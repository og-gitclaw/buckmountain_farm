/**
 * /drops — what's on shelves right now.
 *
 * Mixes manual admin entries with auto-ingested IG hashtag mentions.
 * Each card shows: strain, dispensary, city, status, source attribution,
 * caption. Click-through → strain detail page.
 *
 * Source kinds the page surfaces with proper attribution:
 *   - manual:     admin posted directly via /admin/drops
 *   - instagram:  scraped via scripts/ingest-ig-mentions.mjs
 *   - weedmaps / leafly:  dispensary menu scrape (future)
 *   - nabis:      pulled from /api/cron/nabis-sync (future)
 */

import Link from "next/link";
import { loadCurrentDrops } from "@/lib/current-drops";
import { getStrain } from "@/data/strains";
import { StrainPlaceholder } from "@/components/strain-placeholder";

export const revalidate = 60;

export const metadata = {
  title: "Current Drops — Buck Mountain Cannabis",
  description:
    "Where to find Buck Mountain Cannabis on shelves right now. Dispensary tags, latest drops, and live inventory.",
};

const STATUS_TINT: Record<string, string> = {
  live: "text-emerald-300 border-emerald-700/40",
  "low-stock": "text-amber-300 border-amber-700/40",
  "sold-out": "text-white/40 border-white/15",
  incoming: "text-sky-300 border-sky-700/40",
};

const SOURCE_LABEL: Record<string, string> = {
  manual: "Posted by us",
  instagram: "From Instagram",
  weedmaps: "From Weedmaps",
  leafly: "From Leafly",
  nabis: "From Nabis",
};

export default async function DropsPage() {
  const { rows, stub } = await loadCurrentDrops(60);
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          On shelves now
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Current Drops</h1>
        <p className="mt-4 text-white/70 max-w-2xl">
          Where to find Buck Mountain right now. Auto-collected from dispensary
          IG mentions, our drops, and live inventory feeds. Tap a card for the
          strain page; tap the source to see the original post.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-6xl mx-auto pb-24">
        {rows.length === 0 ? (
          <p className="text-white/50 italic">Nothing live right now.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((d) => {
              const strain = d.strain_slug ? getStrain(d.strain_slug) : null;
              return (
                <article
                  key={d.id}
                  className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] relative">
                    {d.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.hero_image_url}
                        alt={d.caption ?? strain?.name ?? "Drop"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : strain ? (
                      <StrainPlaceholder strain={strain} className="h-full w-full" />
                    ) : (
                      <div className="h-full w-full bg-neutral-900 grid place-items-center text-white/30 text-xs uppercase tracking-wider">
                        Buck Mountain
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border bg-black/60 backdrop-blur ${STATUS_TINT[d.status] ?? ""}`}
                    >
                      {d.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    {strain ? (
                      <Link
                        href={`/strains/${strain.slug}`}
                        className="font-bold text-lg hover:text-amber-200 transition-colors"
                      >
                        {strain.name}
                      </Link>
                    ) : (
                      <span className="font-bold text-lg">
                        {d.product_slug ?? "Buck Mountain"}
                      </span>
                    )}
                    <p className="mt-1 text-sm text-white/65">
                      {d.dispensary_name ?? d.dispensary_id ?? "Dispensary"} ·{" "}
                      {[d.city, d.state].filter(Boolean).join(", ")}
                    </p>
                    {d.caption && (
                      <p className="mt-2 text-sm text-white/55 italic line-clamp-2">
                        “{d.caption}”
                      </p>
                    )}
                    <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-white/45">
                      <span>{SOURCE_LABEL[d.source_kind] ?? d.source_kind}</span>
                      {d.source_url && (
                        <a
                          href={d.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-white"
                        >
                          {d.source_handle ?? "see post"} →
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {stub && (
          <p className="mt-6 text-xs text-white/40 italic">
            Showing placeholder rows — DB not yet seeded with drops. Admin can
            add live entries at <Link href="/admin/drops" className="underline hover:text-white">/admin/drops</Link>, and
            the IG hashtag ingester (see <code>handoff/IG_MENTIONS_INGESTION.md</code>) will populate automatically once enabled.
          </p>
        )}
      </section>
    </main>
  );
}

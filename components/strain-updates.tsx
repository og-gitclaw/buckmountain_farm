/**
 * Strain Updates section — "what just dropped, what's coming next."
 *
 * Per Brendon 2026-05-24 directive: add this on the homepage so visitors
 * can immediately see batch news without hunting through the blog.
 *
 * Data shape comes from strain_updates table (see db/schema.sql). For
 * now this is a stub renderer; the page hosting it passes in records.
 * When Neon lands, the page becomes async and pulls the latest 6 updates.
 *
 * Mobile-2026 effects:
 *   - CSS scroll-driven fade-in on each card (animation-timeline: view())
 *     — degrades gracefully in older browsers (cards just stay visible)
 *   - scroll-snap-align on the horizontal carousel for mobile
 *   - No JS-driven animations — pure CSS so it's free on the main thread
 */

export type StrainUpdate = {
  id: string;
  headline: string;
  strain_slug: string;
  strain_name: string;
  body: string;
  kind: "new-drop" | "batch-update" | "coming-soon" | "limited";
  published_at: string;
};

const KIND_LABEL: Record<StrainUpdate["kind"], string> = {
  "new-drop": "New drop",
  "batch-update": "Batch update",
  "coming-soon": "Coming soon",
  limited: "Limited run",
};

const KIND_TINT: Record<StrainUpdate["kind"], string> = {
  "new-drop": "text-emerald-300 border-emerald-700/40",
  "batch-update": "text-sky-300 border-sky-700/40",
  "coming-soon": "text-amber-300 border-amber-700/40",
  limited: "text-rose-300 border-rose-700/40",
};

export function StrainUpdates({ updates }: { updates: StrainUpdate[] }) {
  return (
    <section
      className="relative z-10 min-h-screen flex flex-col justify-center p-8 md:p-16"
      aria-labelledby="strain-updates-heading"
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-white/50">
              Always grinding
            </p>
            <h2
              id="strain-updates-heading"
              className="text-4xl md:text-6xl font-bold mt-2"
            >
              Strain Updates
            </h2>
          </div>
          <a
            href="/strains/updates"
            className="text-sm text-white/70 hover:text-white border-b border-white/30 hover:border-white pb-0.5"
          >
            See all →
          </a>
        </div>

        {/* Horizontal scroll-snap row on mobile, grid on md+ */}
        <ol
          className="
            flex gap-4 overflow-x-auto snap-x snap-mandatory
            pb-4 -mx-8 px-8
            md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:mx-0 md:px-0 md:overflow-visible
          "
        >
          {updates.map((u) => (
            <li
              key={u.id}
              className="
                min-w-[80%] md:min-w-0 snap-start
                reveal-on-scroll
                rounded-xl border border-white/10 bg-white/[0.03]
                p-5 hover:bg-white/[0.06] transition
              "
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs uppercase tracking-wider px-2 py-1 rounded-full border ${KIND_TINT[u.kind]}`}
                >
                  {KIND_LABEL[u.kind]}
                </span>
                <time className="text-xs text-white/40">{u.published_at}</time>
              </div>
              <h3 className="mt-4 text-xl font-bold leading-tight">
                {u.headline}
              </h3>
              <p className="mt-2 text-sm text-white/70 line-clamp-3">{u.body}</p>
              <a
                href={`/strains/${u.strain_slug}`}
                className="mt-4 inline-block text-sm text-white/80 hover:text-white border-b border-white/30 hover:border-white pb-0.5"
              >
                {u.strain_name} →
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Placeholder data until Neon + the strain_updates table are wired.
// Drawn from the SKU set in docs/research/strain-seo-matrix.md so the
// stub looks plausible rather than lorem-ipsum.
export const PLACEHOLDER_UPDATES: StrainUpdate[] = [
  {
    id: "p-1",
    headline: "Permanent OG · light-assist batch packaged this week",
    strain_slug: "permanent-og",
    strain_name: "Permanent OG",
    body: "Indoor light-assist run, hand-trimmed, jarred yesterday. COA pending. Expect deliveries to start hitting menus next week.",
    kind: "new-drop",
    published_at: "Just now",
  },
  {
    id: "p-2",
    headline: "Gelato 41 — small drop, only ~40 jars",
    strain_slug: "gelato-41",
    strain_name: "Gelato 41",
    body: "Tighter pull from this round; the phenotype hit harder than expected. Limited allocation — call your account rep for placement.",
    kind: "limited",
    published_at: "2d ago",
  },
  {
    id: "p-3",
    headline: "Cheetah Piss is back in the rotation",
    strain_slug: "cheetah-piss",
    strain_name: "Cheetah Piss",
    body: "Pulled the cut from cold storage. First run in the new hoop house — terps are loud. Drops in ~3 weeks.",
    kind: "coming-soon",
    published_at: "5d ago",
  },
];

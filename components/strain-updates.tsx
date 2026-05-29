/**
 * Strain Updates section — "what just dropped, what's coming next."
 *
 * Per Brendon 2026-05-24 directive: add this on the homepage so visitors
 * can immediately see batch news without hunting through the blog.
 *
 * 2026-05-29 background pass:
 *   - The section shows the flower-bud photo behind it via
 *     <StrainUpdatesBackdrop> — a section-scoped parallax layer that
 *     floats slowly on scroll behind a semi-transparent scrim. The
 *     section is `isolate overflow-hidden`, so the layer is clipped to
 *     the panel and can't bleed page-wide like the global
 *     ParallaxBackdrops did. Hairline top/bottom frames keep it reading
 *     as a distinct, framed panel.
 *   - Cards stay proper glass-morphism (heavy bg, backdrop-blur, bright
 *     border, hover lift) so the foreground pops off the softer bud.
 *
 * This file stays a SERVER component on purpose: it also exports
 * PLACEHOLDER_UPDATES + the StrainUpdate type, which server code
 * (lib/strain-updates.ts) imports as real values. The client-only scroll
 * logic lives in ./strain-updates-backdrop.
 *
 * Mobile-2026 effects:
 *   - CSS scroll-driven fade-in on each card (animation-timeline: view())
 *   - scroll-snap-align on the horizontal carousel for mobile
 */

import { StrainUpdatesBackdrop } from "./strain-updates-backdrop";

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
  "new-drop": "text-emerald-200 border-emerald-500/50 bg-emerald-500/10",
  "batch-update": "text-sky-200 border-sky-500/50 bg-sky-500/10",
  "coming-soon": "text-amber-200 border-amber-500/50 bg-amber-500/10",
  limited: "text-rose-200 border-rose-500/50 bg-rose-500/10",
};

export function StrainUpdates({ updates }: { updates: StrainUpdate[] }) {
  return (
    <section
      // `isolate` creates a stacking context so fixed-position parallax
      // layers behind us can't bleed through into our content; the
      // `overflow-hidden` clips our own flower layer to the panel.
      className="relative isolate z-10 min-h-screen flex flex-col justify-center p-8 md:p-16 overflow-hidden"
      aria-labelledby="strain-updates-heading"
    >
      {/* Flower-bud photo on a slow, section-scoped parallax layer behind a
          semi-transparent scrim (client component for the scroll math). */}
      <StrainUpdatesBackdrop />
      {/* Hairline frame at the top + bottom so the section reads as a
          distinct panel even when adjacent sections are also dark. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent -z-10"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent -z-10"
      />

      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-amber-200/80">
              Always grinding
            </p>
            <h2
              id="strain-updates-heading"
              className="text-4xl md:text-6xl font-bold mt-2 text-white"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
            >
              Strain Updates
            </h2>
          </div>
          <a
            href="/strains/updates"
            className="text-sm text-white/80 hover:text-white border-b border-white/30 hover:border-white pb-0.5"
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
                group rounded-2xl border border-white/15
                bg-neutral-950/75 backdrop-blur-xl
                p-5 transition
                hover:border-white/30 hover:bg-neutral-900/80
                shadow-[0_8px_24px_rgba(0,0,0,0.45)]
              "
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] px-2 py-1 rounded-full border ${KIND_TINT[u.kind]}`}
                >
                  {KIND_LABEL[u.kind]}
                </span>
                <time className="text-[11px] text-white/50">{u.published_at}</time>
              </div>
              <h3
                className="mt-4 text-xl font-bold leading-tight text-white"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
              >
                {u.headline}
              </h3>
              <p className="mt-2 text-sm text-white/80 leading-relaxed line-clamp-3">
                {u.body}
              </p>
              <a
                href={`/strains/${u.strain_slug}`}
                className="mt-4 inline-block text-sm font-medium text-amber-200/90 hover:text-amber-100 border-b border-amber-200/30 hover:border-amber-200 pb-0.5 transition-colors"
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

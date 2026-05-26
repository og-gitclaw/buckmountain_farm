/**
 * Small visual lineage chart for the strain detail page.
 *
 * Renders a single-level tree: parent strains across the top, the current
 * strain in the center. If we have the parent slug in our catalog we link
 * it; otherwise it renders as plain text (still useful for SEO).
 *
 * Intentionally compact — strain pages stay readable on mobile.
 */

import Link from "next/link";
import { STRAINS } from "@/data/strains";

export function LineageTree({
  strainName,
  parents,
  lineage,
}: {
  strainName: string;
  parents?: string[];
  lineage?: string;
}) {
  // Nothing to render: skip.
  if (!parents || parents.length === 0) {
    return lineage ? (
      <p className="text-sm text-white/60 italic">{lineage}</p>
    ) : null;
  }

  const catalog = new Set(STRAINS.map((s) => s.slug));

  return (
    <figure className="mt-2">
      <ol className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {parents.map((slug, i) => {
          const inCatalog = catalog.has(slug);
          const label = STRAINS.find((s) => s.slug === slug)?.name ??
            slug.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
          return (
            <li key={slug + i} className="flex items-center gap-2">
              {i > 0 && <span className="text-white/30 select-none">×</span>}
              {inCatalog ? (
                <Link
                  href={`/strains/${slug}`}
                  className="rounded-md border border-white/15 hover:border-white/40 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] transition"
                >
                  {label}
                </Link>
              ) : (
                <span className="rounded-md border border-white/10 px-3 py-1.5 bg-white/[0.02] text-white/70">
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mx-auto mt-3 h-6 w-px bg-white/15" aria-hidden />
      <div className="mx-auto w-fit rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-1.5 text-sm font-semibold text-amber-200">
        {strainName}
      </div>
      {lineage && (
        <figcaption className="mt-3 text-xs text-white/40 italic text-center">
          {lineage}
        </figcaption>
      )}
    </figure>
  );
}

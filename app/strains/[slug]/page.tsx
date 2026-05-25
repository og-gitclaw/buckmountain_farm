/**
 * /strains/[slug] — single strain SEO page.
 *
 * Uses generateStaticParams so all 11 strain pages prerender at build.
 * Once a strain has live batches in the DB, an availability widget +
 * COA list goes below the description (TODO P3).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { STRAINS, getStrain } from "@/data/strains";

export function generateStaticParams() {
  return STRAINS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getStrain(slug);
  if (!s) return { title: "Strain not found — Buck Mountain Cannabis" };
  return {
    title: `${s.name} — Buck Mountain Cannabis`,
    description: s.short_description,
    openGraph: {
      title: `${s.name} — Buck Mountain Cannabis`,
      description: s.short_description,
    },
  };
}

export default async function StrainDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getStrain(slug);
  if (!s) notFound();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-4xl mx-auto">
        <nav className="text-sm mb-6">
          <Link href="/strains" className="text-white/60 hover:text-white">
            ← All strains
          </Link>
        </nav>

        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          {s.type}
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">{s.name}</h1>
        {s.lineage && (
          <p className="mt-3 text-white/60 italic">{s.lineage}</p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3 text-sm">
          {s.thc_typical_pct != null && (
            <Stat label="THC (typical)" value={`${s.thc_typical_pct}%`} />
          )}
          {s.cbd_typical_pct != null && (
            <Stat label="CBD (typical)" value={`${s.cbd_typical_pct}%`} />
          )}
          {s.flavors && (
            <Stat label="Flavor notes" value={s.flavors.join(", ")} />
          )}
          {s.effects && (
            <Stat label="Effects (reported)" value={s.effects.join(", ")} />
          )}
        </div>

        <article className="prose prose-invert mt-10 max-w-none">
          <p className="text-lg text-white/85 leading-relaxed">
            {s.long_description}
          </p>
        </article>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/strains/updates"
            className="rounded-md border border-white/20 hover:border-white/40 px-4 py-3 text-sm text-center"
          >
            Get pinged when next batch drops →
          </Link>
          <Link
            href="/loyalty"
            className="rounded-md bg-white text-black px-4 py-3 text-sm font-semibold text-center"
          >
            Scan a jar → claim points
          </Link>
        </div>

        {s.research_status !== "ready" && (
          <p className="mt-12 text-xs text-white/40 italic border-t border-white/10 pt-4">
            Strain page status: {s.research_status}. Final SEO copy + Leafly /
            Weedmaps / SeedFinder cross-references pending — see{" "}
            <code>docs/research/strain-seo-matrix.md</code>.
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 font-semibold text-white/90">{value}</p>
    </div>
  );
}

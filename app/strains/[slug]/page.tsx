/**
 * /strains/[slug] — Leafly / BMH-clones style strain detail.
 *
 * Layout:
 *   1. Hero card with strain placeholder (or real image when available)
 *   2. Headline + type + family + lineage chip row
 *   3. Visual lineage tree
 *   4. Effect bars (when scored)
 *   5. Flavor + effect words as chip clusters
 *   6. THC/CBD stats
 *   7. Long-form description
 *   8. CTAs (subscribe + scan jar)
 *   9. Related strains (same family, sorted by overlap)
 *
 * Pages prerender via generateStaticParams so all strain URLs hit edge.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { FAMILY_COLOR, STRAINS, getStrain } from "@/data/strains";
import { StrainPlaceholder } from "@/components/strain-placeholder";
import { LineageTree } from "@/components/lineage-tree";
import { EffectBars } from "@/components/effect-bars";
import { NotifyMe } from "@/components/notify-me";

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

  const familyTint = s.hero_color ?? FAMILY_COLOR[s.family];
  const related = STRAINS.filter(
    (x) => x.slug !== s.slug && x.family === s.family,
  ).slice(0, 6);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-5xl mx-auto">
        <nav className="text-sm mb-6">
          <Link href="/strains" className="text-white/60 hover:text-white">
            ← All strains
          </Link>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 items-center">
          {/* Hero card */}
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900">
            {s.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.hero_image_url}
                alt={`${s.name} flower`}
                className="h-full w-full object-cover"
              />
            ) : (
              <StrainPlaceholder strain={s} className="h-full w-full" />
            )}
          </div>

          {/* Title block */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="rounded-full border px-2 py-1 uppercase tracking-wider"
                style={{ borderColor: familyTint, color: "#fafafa" }}
              >
                {s.type}
              </span>
              <span
                className="rounded-full border border-white/20 px-2 py-1 uppercase tracking-wider text-white/70"
              >
                {s.family}
              </span>
              {s.research_status !== "ready" && (
                <span className="rounded-full border border-amber-500/40 px-2 py-1 uppercase tracking-wider text-amber-200/80">
                  {s.research_status}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-4xl md:text-6xl font-bold leading-tight">
              {s.name}
            </h1>
            {s.lineage && (
              <p className="mt-2 text-white/60 italic">{s.lineage}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <NotifyMe strainSlug={s.slug} strainName={s.name} />
              <Link
                href="/loyalty"
                className="rounded-md bg-white text-black px-4 py-2.5 text-sm font-semibold"
              >
                Scan a jar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lineage */}
      {(s.parents?.length || s.lineage) && (
        <section className="px-6 md:px-16 max-w-5xl mx-auto pb-12">
          <h2 className="text-sm uppercase tracking-[0.25em] text-white/45 mb-4">
            Lineage
          </h2>
          <LineageTree
            strainName={s.name}
            parents={s.parents}
            lineage={s.lineage}
          />
        </section>
      )}

      {/* Effects + flavors */}
      <section className="px-6 md:px-16 max-w-5xl mx-auto pb-12 grid gap-8 md:grid-cols-2">
        {s.effect_scores && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm uppercase tracking-[0.25em] text-white/45 mb-4">
              Effects (reported)
            </h2>
            <EffectBars scores={s.effect_scores} />
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
          {s.flavors && s.flavors.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-white/45 mb-2">
                Flavor notes
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {s.flavors.map((f) => (
                  <li
                    key={f}
                    className="text-xs rounded-full border border-amber-500/30 text-amber-100/90 px-2.5 py-1 bg-amber-500/[0.04]"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.effects && s.effects.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-[0.25em] text-white/45 mb-2">
                Effects
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {s.effects.map((e) => (
                  <li
                    key={e}
                    className="text-xs rounded-full border border-white/15 text-white/85 px-2.5 py-1 bg-white/[0.03]"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(s.thc_typical_pct != null || s.cbd_typical_pct != null) && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {s.thc_typical_pct != null && (
                <Stat label="THC (typical)" value={`${s.thc_typical_pct}%`} />
              )}
              {s.cbd_typical_pct != null && (
                <Stat label="CBD (typical)" value={`${s.cbd_typical_pct}%`} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Long description */}
      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-12">
        <h2 className="text-sm uppercase tracking-[0.25em] text-white/45 mb-3">
          About this strain
        </h2>
        <p className="text-lg text-white/85 leading-relaxed">
          {s.long_description}
        </p>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="px-6 md:px-16 max-w-5xl mx-auto pb-24">
          <h2 className="text-sm uppercase tracking-[0.25em] text-white/45 mb-4">
            More in {s.family}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/strains/${r.slug}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition overflow-hidden"
              >
                <div className="aspect-[4/3]">
                  <StrainPlaceholder strain={r} className="h-full w-full" />
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-white/45 mt-0.5">{r.type}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {s.research_status !== "ready" && (
        <p className="px-6 md:px-16 max-w-5xl mx-auto pb-24 text-xs text-white/40 italic border-t border-white/10 pt-4">
          Strain page status: {s.research_status}. Final SEO copy + Leafly /
          Weedmaps / SeedFinder cross-references pending — see{" "}
          <code>docs/research/strain-seo-matrix.md</code>.
        </p>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 font-semibold text-white/90">{value}</p>
    </div>
  );
}

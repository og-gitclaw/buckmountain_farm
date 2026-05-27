/**
 * /strains — strain index, BMH /clones-style.
 *
 * Card grid with family-tinted procedural placeholders, top-three effect
 * chips, lineage hint, type badge. Filter pills above (type + family).
 * Search is in the global nav (Cmd/Ctrl-K or /).
 */

import Link from "next/link";
import { STRAINS, type Strain } from "@/data/strains";
import { StrainPlaceholder } from "@/components/strain-placeholder";
import { StrainFilters } from "@/components/strain-filters";
import { EffectTiles } from "@/components/effect-bars";

export const metadata = {
  title: "Strains — Buck Mountain Cannabis",
  description:
    "Every strain currently in the Buck Mountain Cannabis rotation — light-assist indoor, exotic indoor, concentrate, and vape. Lineage, terpenes, batch availability.",
};

const CATEGORY_LABEL: Record<Strain["category"], string> = {
  "flower-light-assist": "Light-Assist Indoor",
  "flower-exotic": "Exotic Indoor",
  concentrate: "Concentrates",
  vape: "Vape",
};

const CATEGORY_ORDER: Strain["category"][] = [
  "flower-light-assist",
  "flower-exotic",
  "concentrate",
  "vape",
];

export default function StrainsIndex() {
  const byCategory = new Map<Strain["category"], Strain[]>();
  for (const s of STRAINS) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  const types = Array.from(new Set(STRAINS.map((s) => s.type))).sort();
  const families = Array.from(new Set(STRAINS.map((s) => s.family))).sort();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          The rotation
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Strains</h1>
        <p className="mt-4 text-white/70 max-w-2xl">
          Every cut currently in the Buck Mountain rotation. Light-assist
          indoor for consistency, exotic indoor for the loudest phenos, plus
          concentrates and vape carts. Tap a card for lineage + effect bars.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-6xl mx-auto">
        <StrainFilters types={types} families={families} />
      </section>

      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory.get(cat);
        if (!list || list.length === 0) return null;
        return (
          <section
            key={cat}
            className="px-6 md:px-16 max-w-6xl mx-auto pb-12"
          >
            <h2 className="text-2xl font-bold mb-6">{CATEGORY_LABEL[cat]}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <Link
                  key={s.slug}
                  href={`/strains/${s.slug}`}
                  data-strain-card
                  data-type={s.type}
                  data-family={s.family}
                  className="reveal-on-scroll group rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 transition overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] relative">
                    {s.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.hero_image_url}
                        alt={`${s.name} flower`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <StrainPlaceholder strain={s} className="h-full w-full" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg leading-tight">{s.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-white/45">
                        {s.type}
                      </span>
                    </div>
                    {s.lineage && (
                      <p className="text-xs text-white/50 mt-1 italic line-clamp-1">
                        {s.lineage}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-white/70 flex-1 line-clamp-2">
                      {s.short_description}
                    </p>
                    <div className="mt-3">
                      <EffectTiles scores={s.effect_scores} />
                    </div>
                    {s.flavors && (
                      <p className="mt-3 text-[11px] text-white/40">
                        {s.flavors.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <p className="px-6 md:px-16 max-w-6xl mx-auto pb-24 text-xs text-white/40 italic">
        Availability rotates by batch. Subscribe on{" "}
        <Link href="/strains/updates" className="underline hover:text-white">
          /strains/updates
        </Link>{" "}
        to get pinged when a specific cut drops, or check{" "}
        <Link href="/drops" className="underline hover:text-white">
          /drops
        </Link>{" "}
        for what&rsquo;s on shelves right now.
      </p>
    </main>
  );
}

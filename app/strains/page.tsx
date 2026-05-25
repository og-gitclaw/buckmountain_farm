/**
 * /strains — strain index. Cards for every row in data/strains.ts,
 * grouped by category. Each card links to /strains/<slug>.
 *
 * Once Neon is wired, swap the import for a SELECT * FROM strains.
 */

import Link from "next/link";
import { STRAINS, type Strain } from "@/data/strains";

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

export const metadata = {
  title: "Strains — Buck Mountain Cannabis",
  description:
    "Every strain currently in the Buck Mountain Cannabis rotation — light-assist indoor, exotic indoor, concentrate, and vape. Lineage, terpenes, batch availability.",
};

export default function StrainsIndex() {
  const byCategory = new Map<Strain["category"], Strain[]>();
  for (const s of STRAINS) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          The rotation
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Strains</h1>
        <p className="mt-4 text-white/70 max-w-2xl">
          Every cut currently in the Buck Mountain rotation. Light-assist
          indoor for consistency, exotic indoor for the loudest phenos,
          plus concentrates and vape carts.
        </p>
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
                  className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{s.name}</h3>
                    <span className="text-xs uppercase tracking-wider text-white/40">
                      {s.type}
                    </span>
                  </div>
                  {s.lineage && (
                    <p className="text-xs text-white/50 mt-1 italic">
                      {s.lineage}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-white/70 flex-1">
                    {s.short_description}
                  </p>
                  {s.flavors && (
                    <p className="mt-3 text-xs text-white/40">
                      {s.flavors.join(" · ")}
                    </p>
                  )}
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
        to get pinged when a specific cut drops.
      </p>
    </main>
  );
}

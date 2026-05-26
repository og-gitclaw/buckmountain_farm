/**
 * /store — the merch line.
 *
 * Confirmed merch from research (blog announcements, 2026-05-24):
 *   - "Always Grinding" T-Shirts (3 colors)
 *   - Buck Mountain Tech Decks (2 colors, limited)
 *
 * For v1 this is a brochure page that drives users to the IG DMs / email
 * for purchase. v2 wires a real checkout once Brendon picks a backend
 * (Shopify vs BigCommerce vs Square — see handoff/STORE_PLATFORM.md).
 *
 * Cards now use ProductPlaceholder (procedural SVG keyed to line/color)
 * instead of the prior generic logo-on-gradient. Real photos slot into
 * `image_url` on each item; when present the <img> takes over and the
 * placeholder hides.
 */

import { ProductPlaceholder } from "@/components/product-placeholder";

type Item = {
  id: string;
  name: string;
  line: string;
  desc: string;
  price: number;
  status: "available" | "low-stock" | "limited" | "sold-out";
  image_url?: string | null;
};

const ITEMS: Item[] = [
  {
    id: "tee-always-grinding-black",
    name: "Always Grinding Tee — Black",
    line: "Apparel",
    desc: "Heavyweight black cotton tee with the Always Grinding mark. Sierra foothills field-tested.",
    price: 35,
    status: "available",
  },
  {
    id: "tee-always-grinding-natural",
    name: "Always Grinding Tee — Natural",
    line: "Apparel",
    desc: "Unbleached natural cotton with embroidered mark.",
    price: 35,
    status: "available",
  },
  {
    id: "tee-always-grinding-forest",
    name: "Always Grinding Tee — Forest",
    line: "Apparel",
    desc: "Deep forest green to match the hoops.",
    price: 35,
    status: "low-stock",
  },
  {
    id: "techdeck-buck-classic",
    name: "Buck Mountain Tech Deck — Classic",
    line: "Tech Decks",
    desc: "Mini fingerboard with the Buck Mtn antler mark. Limited.",
    price: 18,
    status: "low-stock",
  },
  {
    id: "techdeck-buck-purple",
    name: "Buck Mountain Tech Deck — Purple Frame",
    line: "Tech Decks",
    desc: "Purple-frame edition. Very limited run.",
    price: 18,
    status: "limited",
  },
];

const STATUS_TINT: Record<Item["status"], string> = {
  available: "text-emerald-300",
  "low-stock": "text-amber-300",
  limited: "text-rose-300",
  "sold-out": "text-white/40",
};

export default function StorePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          Apparel & decks
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Always Grinding</h1>
        <p className="mt-4 text-white/70 max-w-xl">
          The Buck Mountain merch line. Tees and tech decks the team actually
          wears + skates. Limited runs; what&rsquo;s up is what&rsquo;s in.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-6xl mx-auto pb-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <article
            key={it.id}
            className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col"
          >
            <div className="aspect-square">
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image_url}
                  alt={it.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <ProductPlaceholder
                  name={it.name}
                  line={it.line}
                  className="h-full w-full"
                />
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-xs uppercase tracking-wider text-white/40">
                {it.line}
              </p>
              <h2 className="mt-1 font-bold text-lg">{it.name}</h2>
              <p className="mt-2 text-sm text-white/70 flex-1">{it.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold">${it.price}</span>
                <span className={`text-xs uppercase tracking-wider ${STATUS_TINT[it.status]}`}>
                  {it.status.replace("-", " ")}
                </span>
              </div>
              <a
                href="https://www.instagram.com/buckmountaincannabis/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-center rounded-md border border-white/20 hover:border-white/40 px-3 py-2 text-sm"
              >
                DM to claim
              </a>
            </div>
          </article>
        ))}
      </section>

      <p className="px-6 md:px-16 max-w-6xl mx-auto pb-12 text-xs text-white/40 italic">
        Stub catalog. Real product images, prices, and checkout land when
        Brendon picks a backend (Shopify vs BigCommerce vs Square) — see
        handoff/STORE_PLATFORM.md.
      </p>
    </main>
  );
}

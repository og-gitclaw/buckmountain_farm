export const metadata = {
  title: "About — Buck Mountain Cannabis",
  description:
    "A legacy cannabis brand in the Sierra foothills of Nevada County. Hybrid environments, hand-pulled light deps, hoop dreams.",
};

/**
 * /about gallery sources:
 *   - public/assets/backdrops/01-hybrid.jpg, 04-jars.jpg
 *       (originally part of the homepage parallax; moved here so the
 *        homepage can lead with the 3 video sections without overstuffing.)
 *   - public/assets/gallery/01–05.*
 *       (the legacy buckmountaincannabis.com photos that didn't slot into
 *        the homepage's 5-backdrop layout — fans-and-rows, greenhouse-rows,
 *        aerial-farm, greenhouse-close-up, always-grinding tees.)
 */
const GALLERY: { src: string; alt: string; caption: string }[] = [
  {
    src: "/assets/gallery/04-aerial-farm.jpg",
    alt: "Aerial view of the Buck Mountain greenhouse complex in the Sierra foothills",
    caption: "Aerial — Sierra Foothills",
  },
  {
    src: "/assets/backdrops/01-hybrid.jpg",
    alt: "Purple cannabis flower under a pink hoop house",
    caption: "Hybrid Environments",
  },
  {
    src: "/assets/gallery/02-fans-and-rows.jpg",
    alt: "Inside the greenhouse: industrial fans and rows of cannabis plants",
    caption: "Inside the Grow",
  },
  {
    src: "/assets/gallery/03-greenhouse-rows.jpg",
    alt: "Cannabis plants in rows of greenhouse beds",
    caption: "Light Dep Rows",
  },
  {
    src: "/assets/gallery/01-greenhouse-close.jpg",
    alt: "Cannabis plant close-up inside the greenhouse",
    caption: "In the Canopy",
  },
  {
    src: "/assets/backdrops/04-jars.jpg",
    alt: "Trimming and hanging cured cannabis",
    caption: "Hand-Trim",
  },
  {
    src: "/assets/gallery/05-always-grinding-tees.png",
    alt: "Always Grinding t-shirt mockups",
    caption: "Always Grinding — Merch",
  },
];

export default function About() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          A legacy farm
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">About</h1>
      </section>

      <article className="px-6 md:px-16 max-w-3xl mx-auto pb-16 space-y-5 text-white/85 leading-relaxed">
        <p>
          Buck Mountain Cannabis is a legacy cannabis brand based in the Sierra
          foothills of Nevada County, California. We grow across hybrid
          environments — hand-pulled light deps, mixed-light hoop houses, and
          indoor light-assist rooms — using a syngonic approach to plant
          nutrition.
        </p>
        <p>
          Our motto is &ldquo;always grinding for the highest quality.&rdquo; We
          treat every batch like it&rsquo;s our last. That shows up in the
          trim, in the cure, in the jar.
        </p>
        <p>
          The Buck Mountain rotation covers light-assist indoor flower, exotic
          indoor, badder-style concentrates, and our award-winning cold-pressed
          rosin vape. Each strain has a page at{" "}
          <a href="/strains" className="underline hover:text-white">
            /strains
          </a>
          .
        </p>
        <p>
          For wholesale + dispensary inquiries, hit{" "}
          <a href="/contact" className="underline hover:text-white">
            /contact
          </a>
          .
        </p>
      </article>

      <section className="px-6 md:px-16 max-w-6xl mx-auto pb-24">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          The farm in pictures
        </p>
        <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-10">Gallery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GALLERY.map((img) => (
            <figure
              key={img.src}
              className="group relative overflow-hidden rounded-lg bg-neutral-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-sm text-white/90">
                {img.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

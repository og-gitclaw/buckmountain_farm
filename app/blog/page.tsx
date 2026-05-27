/**
 * /blog — mirrors the legacy buckmountaincannabis.com/blog.
 *
 * Stub list until Neon + the blog_posts table land. The legacy site
 * had a real blog with posts announcing drops (Always Grinding tees,
 * Tech Decks); we preserve those slugs / titles to keep SEO continuity
 * after the Chrome MCP rip pulls the real bodies.
 */

import Link from "next/link";

const POSTS = [
  {
    slug: "always-grinding-tees-dropped",
    title: "Always Grinding Tees just dropped — three colors",
    excerpt:
      "Heavyweight cotton, embroidered mark, three colorways. Limited first run.",
    date: "2026-04",
  },
  {
    slug: "buck-mountain-tech-decks",
    title: "Buck Mountain Tech Decks — limited",
    excerpt: "Two colorways. Skate the antler.",
    date: "2026-03",
  },
  {
    slug: "permanent-og-light-assist-notes",
    title: "Notes from the Permanent OG light-assist run",
    excerpt: "How the new hoop house dialed in the terpene profile.",
    date: "2026-02",
  },
];

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-4xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          From the farm
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Blog</h1>
        <p className="mt-4 text-white/70 max-w-xl">
          Drop announcements, batch notes, behind-the-scenes from the hoops
          and the indoor rooms.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-4xl mx-auto pb-24">
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {POSTS.map((p) => (
            <li key={p.slug} className="py-6 reveal-on-scroll">
              <time className="text-xs uppercase tracking-wider text-white/40">
                {p.date}
              </time>
              <h2 className="mt-1 text-2xl font-bold">
                <Link
                  href={`/blog/${p.slug}`}
                  className="hover:text-white/70 transition"
                >
                  {p.title}
                </Link>
              </h2>
              <p className="mt-2 text-white/70">{p.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

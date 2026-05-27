/**
 * /blog/[slug] — single blog post. Stub until Neon + the blog_posts
 * table land. Slugs match what the legacy /blog used so old links
 * 200 instead of 404.
 *
 * Once the Chrome MCP rip pulls real bodies, this page becomes
 * async + reads from blog_posts.
 */

import Link from "next/link";
import { notFound } from "next/navigation";

const POSTS: Record<
  string,
  { title: string; date: string; body: string }
> = {
  "always-grinding-tees-dropped": {
    title: "Always Grinding Tees just dropped — three colors",
    date: "2026-04",
    body: "Heavyweight cotton, embroidered Buck Mtn mark, three colorways: black, natural, forest. The team has been wearing these in the hoops since spring. DM @buckmountaincannabis to claim — limited first run.",
  },
  "buck-mountain-tech-decks": {
    title: "Buck Mountain Tech Decks — limited",
    date: "2026-03",
    body: "Two colorways of the Buck Mtn fingerboard. Skate the antler. Very limited.",
  },
  "permanent-og-light-assist-notes": {
    title: "Notes from the Permanent OG light-assist run",
    date: "2026-02",
    body: "How the new hoop-house light-assist room dialed in the trichome density on the Permanent OG cut. Notes on water schedule, syngonic nutrient mix, and trim crew workflow.",
  },
};

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return { title: "Post not found — Buck Mountain Cannabis" };
  return {
    title: `${post.title} — Buck Mountain Cannabis`,
    description: post.body.slice(0, 160),
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <article className="pt-28 md:pt-36 pb-24 px-6 md:px-16 max-w-3xl mx-auto">
        <nav className="text-sm mb-6">
          <Link href="/blog" className="text-white/60 hover:text-white">
            ← Blog
          </Link>
        </nav>
        <time className="text-xs uppercase tracking-wider text-white/40">
          {post.date}
        </time>
        <h1 className="text-4xl md:text-6xl font-bold mt-2 leading-tight">
          {post.title}
        </h1>
        <div className="mt-8 text-white/85 leading-relaxed whitespace-pre-line">
          {post.body}
        </div>
        <p className="mt-12 text-xs text-white/40 italic border-t border-white/10 pt-4">
          Body is a stub pending the Chrome MCP rip of the legacy /blog post.
          See <code>handoff/LEGACY_SITE_AUDIT.md</code>.
        </p>
      </article>
    </main>
  );
}

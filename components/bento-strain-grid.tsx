"use client";

/**
 * Bento-grid of strain tiles, each with its own micro-video / placeholder.
 *
 * 2026 trend: bento layouts replace the rigid 3-up grid with a mixed
 * aspect-ratio tiling that creates rhythm + visual hierarchy. Featured
 * strains get the big tiles, the rest cascade.
 *
 * Each tile is its own IntersectionObserver-paused loop so we never
 * decode more than what's visible.
 */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { STRAINS, FAMILY_COLOR, type Strain } from "@/data/strains";
import { StrainPlaceholder } from "@/components/strain-placeholder";
import { EffectTiles } from "@/components/effect-bars";

const FEATURED_SLUGS = [
  "permanent-og",
  "cheetah-piss",
  "gelato-41",
  "strawberry-lobster",
  "permanent-marker",
  "grape-lobster",
  "hashberger",
];

/** Bento span recipe — same length as FEATURED_SLUGS. Edit to re-tile. */
const SPANS = [
  "md:col-span-2 md:row-span-2", // big anchor
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-1", // wide
  "md:col-span-1 md:row-span-2", // tall
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
];

export function BentoStrainGrid({
  videoForSlug,
}: {
  /** Map slug → video URL when we have per-strain micro-loops. */
  videoForSlug?: Partial<Record<string, string>>;
}) {
  const list = FEATURED_SLUGS
    .map((slug) => STRAINS.find((s) => s.slug === slug))
    .filter(Boolean) as Strain[];

  return (
    <section
      className="relative z-10 px-6 md:px-16 py-16 md:py-24"
      aria-labelledby="bento-heading"
    >
      <div className="max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          The rotation
        </p>
        <h2
          id="bento-heading"
          className="text-4xl md:text-6xl font-bold mt-2 mb-10"
        >
          What&rsquo;s in the room
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 md:auto-rows-[180px] gap-3 md:gap-4">
          {list.map((s, i) => (
            <BentoTile
              key={s.slug}
              strain={s}
              videoSrc={videoForSlug?.[s.slug]}
              spanClass={SPANS[i] ?? ""}
              priorityIO={i < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoTile({
  strain,
  videoSrc,
  spanClass,
  priorityIO,
}: {
  strain: Strain;
  videoSrc?: string;
  spanClass: string;
  priorityIO: boolean;
}) {
  const tileRef = useRef<HTMLAnchorElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const tile = tileRef.current;
    const video = videoRef.current;
    if (!tile || !video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: priorityIO ? 0 : 0.25 },
    );
    io.observe(tile);
    return () => io.disconnect();
  }, [priorityIO]);

  const tint = strain.hero_color ?? FAMILY_COLOR[strain.family];

  return (
    <Link
      href={`/strains/${strain.slug}`}
      ref={tileRef}
      className={`reveal-on-scroll group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] ${spanClass}`}
    >
      <div className="absolute inset-0">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            aria-hidden
          />
        ) : (
          <StrainPlaceholder strain={strain} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        )}
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75) 100%)`,
        }}
      />
      <div className="relative z-10 h-full p-4 flex flex-col justify-end">
        <span
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border w-fit"
          style={{ borderColor: tint, color: "#fff" }}
        >
          {strain.type}
        </span>
        <h3 className="mt-2 font-bold text-xl md:text-2xl leading-tight">
          {strain.name}
        </h3>
        <div className="mt-2 opacity-90">
          <EffectTiles scores={strain.effect_scores} />
        </div>
      </div>
    </Link>
  );
}

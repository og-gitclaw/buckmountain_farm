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
 *
 * Layout (2026-05-27 rework): cleaner content stack so text + chips
 * never compete with the placeholder. Top: small type pill. Bottom:
 * strain name + 3-chip effect row, anchored to a soft floor gradient.
 * StrainPlaceholder renders in `background` variant — no internal
 * letter or label fighting the foreground copy.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
          Currently flowering
        </p>
        <h2
          id="bento-heading"
          className="text-4xl md:text-6xl font-bold mt-2 mb-10"
        >
          What&rsquo;s Flowering
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 md:auto-rows-[200px] gap-3 md:gap-4">
          {list.map((s, i) => (
            <BentoTile
              key={s.slug}
              strain={s}
              // Prop override beats the rendered strain field, so legacy
              // callers passing a one-off map still win.
              videoSrc={videoForSlug?.[s.slug] ?? s.tile_loop_url ?? undefined}
              posterSrc={s.poster_url ?? s.hero_image_url ?? undefined}
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
  posterSrc,
  spanClass,
  priorityIO,
}: {
  strain: Strain;
  videoSrc?: string;
  posterSrc?: string;
  spanClass: string;
  priorityIO: boolean;
}) {
  const tileRef = useRef<HTMLAnchorElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
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
  }, [priorityIO, reduced]);

  // Reduced-motion: ignore the video src entirely so we never even decode it.
  const effectiveVideoSrc = reduced ? undefined : videoSrc;

  const tint = strain.hero_color ?? FAMILY_COLOR[strain.family];

  return (
    <Link
      href={`/strains/${strain.slug}`}
      ref={tileRef}
      className={`reveal-on-scroll group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/25 transition ${spanClass}`}
    >
      {/* Background layer: video if provided, otherwise the placeholder
          in `background` variant — gradient + atmospheric blobs only,
          no internal text. Foreground copy gets to breathe. */}
      <div className="absolute inset-0">
        {effectiveVideoSrc ? (
          <video
            ref={videoRef}
            src={effectiveVideoSrc}
            poster={posterSrc}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            aria-hidden
          />
        ) : posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc}
            alt=""
            aria-hidden
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <StrainPlaceholder
            strain={strain}
            variant="background"
            className="h-full w-full transition-transform duration-700 group-hover:scale-105"
          />
        )}
      </div>

      {/* Floor gradient so the text band reads on any backdrop. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Top-left: type pill */}
      <span
        className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border bg-black/45 backdrop-blur-sm"
        style={{ borderColor: `${tint}80`, color: "#fff" }}
      >
        {strain.type}
      </span>

      {/* Bottom content stack — name + effects */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5">
        <h3 className="font-bold text-lg md:text-xl leading-tight">
          {strain.name}
        </h3>
        <div className="mt-2.5">
          <EffectTiles scores={strain.effect_scores} />
        </div>
      </div>
    </Link>
  );
}

"use client";

/**
 * Strain tile micro-loop video.
 *
 * Plays a muted, looping H.264/VP9/AV1 sibling set ONLY while the tile is
 * intersecting the viewport — every off-screen tile is paused so we never
 * decode more than what's visible. Falls back to the poster image (and
 * children, e.g. a StrainPlaceholder) when the loop is absent or when the
 * user prefers reduced motion.
 *
 * Lives next to the existing BentoStrainGrid pattern but is reusable from
 * any tile (/strains index, homepage bento, related strains rail).
 *
 * Source: data/strains.ts -> { tile_loop_url, poster_url }
 *         derived from POST /api/admin/assets records tagged role:loop /
 *         role:poster by chl0e (handoff/CINEMATIC_STRAIN_PREVIEWS.md).
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  alt: string;
  className?: string;
  /** Lower threshold (0) for above-the-fold tiles so they wake instantly. */
  priorityIO?: boolean;
};

export function StrainTileVideo({
  src,
  poster,
  alt,
  className,
  priorityIO = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
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
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;
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
    io.observe(wrap);
    return () => io.disconnect();
  }, [priorityIO, reduced]);

  if (reduced) {
    return poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt={alt} className={className} loading="lazy" />
    ) : null;
  }

  return (
    <div ref={wrapRef} className={className}>
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

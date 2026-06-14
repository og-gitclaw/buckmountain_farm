"use client";

/**
 * Strain cinematic — the 12-18s "jar in your hand" composite that plays on
 * /strains/[slug]. Lives as a small client component so the parent page
 * stays SSG (generateStaticParams + statically prerendered).
 *
 * UX:
 *   - First paint = poster image (no JS required to see the strain).
 *   - On mount, swap in the <video> with preload="none" + auto-play muted
 *     loop. User can tap for sound (controls revealed on hover/focus).
 *   - IntersectionObserver pauses the video when scrolled out of the
 *     viewport (and resumes on re-entry) so it doesn't burn CPU/battery
 *     decoding frames the user can't see. Threshold 0.15 = a small sliver
 *     visible counts as "in view".
 *   - prefers-reduced-motion: stay on the poster — never auto-play.
 *
 * Source: data/strains.ts -> { cinematic_url, poster_url }, populated from
 * POST /api/admin/assets records tagged role:cine / role:poster by chl0e
 * (handoff/CINEMATIC_STRAIN_PREVIEWS.md §A stage 3).
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  alt: string;
  className?: string;
};

export function StrainCinematic({ src, poster, alt, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setShowVideo(!mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      setShowVideo(!e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Pause when offscreen — battery + cellular friendly. Matches the
  // pattern used by VideoParallaxHero, VideoScene, FramedVideoCard, and
  // the BentoStrainGrid tiles so no <video> on the site decodes frames
  // outside the viewport.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().catch(() => {
            /* autoplay may be blocked on mobile data-saver; poster stays */
          });
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced, src]);

  if (!showVideo || reduced) {
    return poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt={alt} className={className} />
    ) : null;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      autoPlay
      playsInline
      preload="none"
      controls
      aria-label={alt}
      className={className}
    />
  );
}

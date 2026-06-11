"use client";

/**
 * FramedVideoCard — calm replacement for the full-bleed scroll-scrub
 * section ("Inside the room").
 *
 * The copy sits ABOVE the footage in normal page flow and the video
 * renders inside a rounded, inset frame: an object you look at, not an
 * environment that takes over the viewport. No scroll-linked playback —
 * the loop simply plays while the frame is on screen and pauses off
 * screen, so there is no keyframe-density requirement on the encode and
 * nothing for the visitor to "drive."
 *
 * Motion notes:
 *   - poster should be the FIRST frame of the loop so playback starting
 *     is invisible (no flash, no crossfade machinery needed)
 *   - one-time scale settle (1.04 -> 1) on first reveal, CSS-only
 *     (.video-settle in globals.css); the global reduced-motion rules
 *     collapse it to an instant snap
 *   - prefers-reduced-motion: the video never autoplays — the poster
 *     stays, copy is unaffected
 *   - preload="metadata" only; bytes stream when the section approaches
 */

import { useEffect, useRef, useState } from "react";

export function FramedVideoCard({
  src,
  poster,
  children,
}: {
  src: string;
  poster?: string;
  /** Copy block rendered above the frame — compose with
   *  .reveal-stagger-item children for the staggered entrance. */
  children?: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [settled, setSettled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame || !video) return;
    if (reducedMotion) {
      video.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSettled(true);
          video.play().catch(() => {
            /* autoplay blocked — poster stays */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <section className="relative z-10 bg-neutral-950 px-6 md:px-16 py-16 md:py-24">
      <div className="max-w-5xl mx-auto">
        {children && <div className="reveal-stagger">{children}</div>}
        <div
          ref={frameRef}
          className="mt-8 md:mt-10 relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover ${
              settled ? "video-settle" : ""
            }`}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

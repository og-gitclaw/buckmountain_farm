"use client";

/**
 * FramedVideoCard — calm replacement for the full-bleed scroll-scrub
 * section ("Inside the room").
 *
 * The copy sits ABOVE the footage in normal page flow and the video
 * renders inside a rounded, inset frame: an object you look at, not an
 * environment that takes over the viewport. No scroll-linked playback —
 * the loop simply plays while the frame is FULLY on screen and pauses
 * otherwise, so there is no keyframe-density requirement on the encode and
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
 *   - preload="none": the video pulls ZERO bytes on page land (poster only).
 *     It downloads on demand the moment it's played — which only happens once
 *     the whole frame is in view — so it never competes with the hero for
 *     bandwidth on initial load.
 *   - playback holds until the ENTIRE frame is in the viewport, so this loop
 *     never animates while another section's video is the focus of attention
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

  // Playback gate: play only while the ENTIRE frame is in the viewport.
  // Calling play() on a preload="none" video is what triggers the download,
  // so the bytes stream exactly when the visitor reaches this section and
  // never on page land. Threshold array lets us read intersectionRatio;
  // >= 0.98 ≈ "the whole frame is inside the viewport". The rect fallback
  // covers the (here impossible) case of a frame taller than the viewport.
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
        const vh = window.innerHeight || 1;
        const r = entry.boundingClientRect;
        const fullyVisible =
          entry.intersectionRatio >= 0.98 ||
          (r.height > vh && r.top <= 0 && r.bottom >= vh);
        if (fullyVisible) {
          setSettled(true);
          video.play().catch(() => {
            /* autoplay blocked — poster stays */
          });
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.98, 1] },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <section className="relative z-10 bg-neutral-950 px-6 md:px-16 pt-12 md:pt-16 pb-16 md:pb-24">
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
            preload="none"
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

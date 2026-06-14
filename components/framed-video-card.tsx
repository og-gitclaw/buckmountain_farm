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
 *   - preload="none" until the homepage load coordinator releases this slot
 *     in the sequential chain (after the video before it is buffered), so it
 *     never competes with the hero for bandwidth on page land
 *   - playback holds until the ENTIRE frame is in the viewport, so this loop
 *     never animates while another section's video is the focus of attention
 */

import { useEffect, useRef, useState } from "react";
import { useSequentialVideoLoad } from "@/components/video-load-coordinator";

export function FramedVideoCard({
  src,
  poster,
  loadOrder = 1,
  children,
}: {
  src: string;
  poster?: string;
  /** Position in the homepage sequential video-load chain. */
  loadOrder?: number;
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

  // Sequential load: bytes only stream once the prior video is buffered and
  // this frame is within ~1 viewport. `ready` flips true when buffered.
  const { ready } = useSequentialVideoLoad({
    order: loadOrder,
    videoRef,
    disabled: reducedMotion,
  });

  // Playback gate: only while the frame is FULLY in view AND its bytes are in
  // memory. Threshold array lets us read intersectionRatio; >= 0.98 ≈ "the
  // whole frame is inside the viewport". The rect fallback covers the (here
  // impossible) case of a frame taller than the viewport.
  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame || !video) return;
    if (reducedMotion) {
      video.pause();
      return;
    }
    let fullyVisible = false;
    const apply = () => {
      if (fullyVisible && ready) {
        setSettled(true);
        video.play().catch(() => {
          /* autoplay blocked — poster stays */
        });
      } else {
        video.pause();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        const vh = window.innerHeight || 1;
        const r = entry.boundingClientRect;
        fullyVisible =
          entry.intersectionRatio >= 0.98 ||
          (r.height > vh && r.top <= 0 && r.bottom >= vh);
        apply();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.98, 1] },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, [reducedMotion, ready]);

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

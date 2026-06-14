"use client";

/**
 * FramedImageCard — still-photo sibling of <FramedVideoCard>.
 *
 * Same framing system: copy above in normal flow, the photograph in a
 * rounded inset 16:9 frame. Instead of a video loop, the still drifts
 * slowly INSIDE the frame as you scroll (section-scoped parallax — the
 * layer is 130% tall with -15% overscan so the shift never exposes an
 * edge). The page keeps one visual vocabulary: media lives in frames,
 * text lives on the page.
 *
 * Motion safety, same as the rest of the kit:
 *   - prefers-reduced-motion: transform disabled, image sits static
 *   - rAF-throttled scroll handler, attached only while on screen
 *     (IntersectionObserver)
 */

import { useRef } from "react";
import { useSmoothParallax } from "@/lib/use-smooth-parallax";

export function FramedImageCard({
  src,
  alt = "",
  parallaxFactor = 0.18,
  children,
}: {
  src: string;
  alt?: string;
  /** Fraction of the frame height the image travels across the full
   *  scroll-through. Keep ≤ 0.26 so the 15% overscan always covers it. */
  parallaxFactor?: number;
  /** Copy block above the frame — compose with .reveal-stagger-item
   *  children for the staggered entrance. */
  children?: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Smoothed (lerped) parallax inside the frame — shared damping keeps
  // the drift consistent with the hero + Strain Updates backdrop.
  useSmoothParallax({
    triggerRef: frameRef,
    getTarget: () => {
      const frame = frameRef.current;
      if (!frame) return 0;
      const rect = frame.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 as the frame's top reaches the viewport bottom, 1 as its
      // bottom clears the viewport top.
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + rect.height)),
      );
      const travel = rect.height * parallaxFactor;
      return (0.5 - progress) * travel;
    },
    apply: (y) => {
      const layer = layerRef.current;
      if (layer) layer.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    },
    reset: () => {
      const layer = layerRef.current;
      if (layer) layer.style.transform = "";
    },
  });

  return (
    <section className="relative z-10 bg-neutral-950 px-6 md:px-16 pt-12 md:pt-16 pb-16 md:pb-24">
      <div className="max-w-5xl mx-auto">
        {children && <div className="reveal-stagger">{children}</div>}
        <div
          ref={frameRef}
          className="mt-8 md:mt-10 relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
        >
          <div
            ref={layerRef}
            className="absolute inset-x-0 -top-[15%] h-[130%] w-full will-change-transform"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

/**
 * Strain Updates backdrop — the flower-bud photo on a slow, section-scoped
 * parallax layer behind a semi-transparent scrim.
 *
 * Kept in its own client module so the parent <StrainUpdates> stays a
 * server component: that file also exports PLACEHOLDER_UPDATES + the
 * StrainUpdate type, which server code (lib/strain-updates.ts) imports as
 * real values. Marking the parent "use client" would turn those exports
 * into client references and break the homepage data load.
 *
 * The root div is `absolute inset-0`, so its bounding box tracks the
 * section — we drive the parallax off the root's own rect, no parent ref
 * needed. The layer is 130% tall with -15% overscan so the ±travel shift
 * never exposes an edge inside the section's overflow-hidden box.
 *
 * Motion safety: prefers-reduced-motion disables the transform (image
 * sits static). The scroll handler only runs while on screen
 * (IntersectionObserver) and is rAF-throttled.
 */

import { useEffect, useRef, useState } from "react";

export function StrainUpdatesBackdrop() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;

    let raf = 0;
    let visible = false;

    const update = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 as the top reaches the viewport bottom, 1 as the
      // bottom clears the viewport top.
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + rect.height)),
      );
      // 2026-06-11: 0.22 → 0.28 per Brendon — livelier drift on scroll.
      // Hard ceiling is 0.30 (±travel/2 must stay inside the 15% overscan
      // or the image edge shows inside the section box).
      const travel = rect.height * 0.28;
      const y = (0.5 - progress) * travel;
      layer.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };

    const onScroll = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) update();
      },
      { threshold: 0 },
    );
    io.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div
        ref={layerRef}
        className="absolute inset-x-0 -top-[15%] h-[130%] w-full will-change-transform"
      >
        <img
          src="/assets/backdrops/01-hybrid.jpg"
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "brightness(0.92) saturate(1.05)" }}
          loading="lazy"
          decoding="async"
        />
      </div>
      {/* Scrim: purple brand glow in the center fading to a darker vignette
          at the edges. A vertical linear gradient stacks on top of the
          radial scrim so the top 14% and bottom 14% of the section are
          near-fully-black (0.92–1.0). Section terminates in pure black,
          no flower silhouette leaking into the adjacent section. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.0) 14%, rgba(0,0,0,0.0) 68%, rgba(0,0,0,0.92) 94%, rgba(0,0,0,1) 100%), radial-gradient(ellipse at 50% 32%, rgba(91,58,138,0.20) 0%, rgba(10,10,10,0.52) 48%, rgba(10,10,10,0.80) 100%)",
        }}
      />
    </div>
  );
}

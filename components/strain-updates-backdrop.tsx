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
 * needed. The layer is 170% tall with -35% overscan so the ±travel shift
 * never exposes an edge inside the section's overflow-hidden box.
 *
 * Motion safety: prefers-reduced-motion disables the transform (image
 * sits static). The scroll handler only runs while on screen
 * (IntersectionObserver) and is rAF-throttled.
 */

import { useRef } from "react";
import { useSmoothParallax } from "@/lib/use-smooth-parallax";

export function StrainUpdatesBackdrop() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Smoothed (lerped) parallax — the bud photo trails the scroll instead
  // of snapping to it. Shared damping = same feel as the hero + cards.
  useSmoothParallax({
    triggerRef: rootRef,
    getTarget: () => {
      const root = rootRef.current;
      if (!root) return 0;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 as the top reaches the viewport bottom, 1 as the
      // bottom clears the viewport top.
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + rect.height)),
      );
      // 2026-06-16: 0.28 → 0.55 → 0.65 per Brendon, dialing toward the
      // letsgopaint.space-style drift. Buffer keeps pace: -35% top + 170%
      // layer height = 35% buffer above and below, ceiling is 0.70 (±travel/2
      // must stay inside the 35% buffer or the image edge shows inside the
      // section box). At 0.65 we're at ±32.5% — 2.5% safety margin, same
      // proportional safety as the prior 0.55-in-30% combo.
      const travel = rect.height * 0.65;
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
    <div ref={rootRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div
        ref={layerRef}
        className="absolute inset-x-0 -top-[35%] h-[170%] w-full will-change-transform"
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
          at the edges — frames the bud and keeps the cards legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 32%, rgba(91,58,138,0.20) 0%, rgba(10,10,10,0.52) 48%, rgba(10,10,10,0.80) 100%)",
        }}
      />
    </div>
  );
}

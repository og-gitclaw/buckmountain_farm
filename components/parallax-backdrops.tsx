"use client";

/**
 * Slow-scroll parallax backdrops — section-scoped sticky pattern.
 *
 * Why this isn't `position: fixed` anymore:
 *   The earlier version used `position: fixed inset-0` to feel pinned
 *   to the viewport. That works visually within the parallax section
 *   itself, but `fixed` escapes the parent stacking context — so the
 *   moment the layer gained any opacity, it painted OVER every section
 *   above it in the DOM (the hero, the scroll-scrubbed cultivation
 *   video, etc.). The `startOffset` knob was a band-aid that was easy
 *   to mis-tune as the page grew.
 *
 * The fix: an absolute-positioned wrapper fills the parent section's
 * entire scroll area, and an inner `sticky top-0 h-screen` div pins
 * to the viewport while the parent is being scrolled through — then
 * releases when the parent scrolls off. Same parallax feel, naturally
 * scoped: the backdrop literally cannot paint outside its parent.
 *
 * Cross-fade between images is driven by the section's own scroll
 * progress (rect.top relative to viewport), not window.scrollY, so
 * the math is local to the section and doesn't drift when sections
 * are added above.
 *
 * Respects `prefers-reduced-motion`: parallax translation disabled,
 * cross-fade only. Mobile-safe — no `background-attachment: fixed`.
 *
 * Backdrops live in /public/assets/backdrops/. If a file is missing
 * the spot stays dark — the page still works.
 */

import { useEffect, useRef, useState } from "react";

type Backdrop = { src: string; caption?: string };

export function ParallaxBackdrops({
  images,
  parallaxFactor = 0.15,
  overlayOpacity = 0.55,
  // Kept for API compatibility with earlier callers — no longer needed
  // because the sticky-in-section approach scopes the layer naturally.
  startOffset: _startOffset,
}: {
  images: Backdrop[];
  parallaxFactor?: number;
  overlayOpacity?: number;
  startOffset?: number;
}) {
  void _startOffset;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // pxIntoSection: how many CSS pixels of scroll have happened since the
  // top of the parent section reached the top of the viewport. Negative
  // values clamp to 0 (section not yet reached).
  const [pxIntoSection, setPxIntoSection] = useState(0);
  const [vh, setVh] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    setVh(window.innerHeight);
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const el = wrapperRef.current?.parentElement; // the parent <section>
        if (el) {
          const rect = el.getBoundingClientRect();
          setPxIntoSection(Math.max(0, -rect.top));
        }
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const progress = vh > 0 ? pxIntoSection / vh : 0;

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {images.map((img, i) => {
          const distance = Math.abs(progress - i);
          const opacity = Math.max(0, 1 - distance);
          const translateY = reducedMotion
            ? 0
            : (pxIntoSection - i * vh) * parallaxFactor * -1;
          return (
            <div
              key={img.src}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${img.src})`,
                  transform: `translate3d(0, ${translateY}px, 0)`,
                  willChange: reducedMotion ? "auto" : "transform",
                }}
              />
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: overlayOpacity }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

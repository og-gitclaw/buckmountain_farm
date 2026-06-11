"use client";

/**
 * ParallaxImageBreather — a calm, section-scoped still-image panel with a
 * slow scroll-coupled parallax shift. Sits BETWEEN autoplay video sections
 * on the homepage so the scroll rhythm is video → stable → video → stable
 * rather than a wall of moving footage.
 *
 * Architecture mirrors <StrainUpdatesBackdrop>: outer wrapper is the
 * section box, an inner 130%-tall layer with -15% overscan is what we
 * translate, so the parallax shift never exposes an edge inside the
 * section's overflow-hidden box. Top + bottom of the section terminate in
 * near-fully-black gradient stops to match the rest of the homepage
 * boundary treatment (PR #21).
 *
 * Motion safety:
 *   - prefers-reduced-motion: transform disabled, image sits static.
 *   - rAF-throttled scroll handler.
 *   - IntersectionObserver gates the handler so offscreen breathers do
 *     no work.
 */

import { useEffect, useRef, useState } from "react";

export function ParallaxImageBreather({
  src,
  alt = "",
  caption,
  heightSvh = 70,
  parallaxFactor = 0.18,
  children,
}: {
  src: string;
  alt?: string;
  /** Optional uppercase-tracked one-liner centered in the panel. Skip for
   *  a fully silent breather. */
  caption?: string;
  /** Section height in svh (stable mobile viewport). Default 70 so the
   *  breather reads as a pause, not a full new chapter. */
  heightSvh?: number;
  /** 0..1. Higher = more visible drift. */
  parallaxFactor?: number;
  /** Optional full copy block (eyebrow / h2 / body) centered over the
   *  image — turns the silent breather into a content moment (e.g. the
   *  philosophy section). Gets a localized radial scrim behind the text
   *  only, so the photography stays vivid at the edges. Takes precedence
   *  over `caption`. */
  children?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
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
      const progress = Math.max(
        0,
        Math.min(1, (vh - rect.top) / (vh + rect.height)),
      );
      const travel = rect.height * parallaxFactor;
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
  }, [reducedMotion, parallaxFactor]);

  return (
    <section
      ref={rootRef}
      className="relative isolate w-full overflow-hidden"
      style={{ height: `${heightSvh}svh` }}
      aria-label={caption ?? (children ? undefined : "Visual breather")}
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
      {/* Same black hand-off pattern as VideoScene / ScrollScrubbedVideo
          (PR #21) so the breather terminates cleanly into the adjacent
          video sections instead of half-transparent bleed. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 8%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.55) 92%, rgba(0,0,0,0.95) 100%)",
        }}
      />
      {children ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 md:px-16">
          <div className="relative max-w-2xl text-center">
            {/* Localized scrim — a soft pool of shadow behind the copy
                only, so the photo stays vivid instead of being dimmed
                edge-to-edge. */}
            <div
              aria-hidden
              className="absolute -inset-x-10 -inset-y-10 md:-inset-x-16 md:-inset-y-12 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(8,8,8,0.66) 0%, rgba(8,8,8,0.5) 55%, rgba(8,8,8,0) 100%)",
              }}
            />
            <div className="relative reveal-stagger">{children}</div>
          </div>
        </div>
      ) : caption ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8">
          <p
            className="uppercase tracking-[0.4em] text-xs md:text-sm text-white/75 text-center"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
          >
            {caption}
          </p>
        </div>
      ) : null}
    </section>
  );
}

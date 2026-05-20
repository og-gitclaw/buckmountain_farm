"use client";

/**
 * Slow-scroll parallax backdrops — skrollr-style fixed-feel without
 * `background-attachment: fixed` (which is broken on mobile Safari).
 *
 * Each image fills the viewport behind the page content. As the user
 * scrolls, the images translate Y at a fraction of scroll speed (factor)
 * so they appear to drift instead of staying static. A translucent
 * overlay sits between the image and the foreground so text remains
 * legible without obliterating the photography.
 *
 * Respects `prefers-reduced-motion`: when reduced motion is preferred,
 * the parallax effect is disabled and backdrops cross-fade only.
 *
 * Backdrops are placed in /public/assets/backdrops/. If a file is
 * missing (e.g. before P1.5 asset rip runs), the spot stays dark —
 * the page still works.
 */

import { useEffect, useRef, useState } from "react";

type Backdrop = { src: string; caption?: string };

export function ParallaxBackdrops({
  images,
  parallaxFactor = 0.15,
  overlayOpacity = 0.55,
}: {
  images: Backdrop[];
  parallaxFactor?: number;
  overlayOpacity?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
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
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // Each backdrop occupies one "viewport-height worth of scroll" cross-fade.
  // The active backdrop is determined by scrollY / window.innerHeight.
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const progress = vh > 0 ? scrollY / vh : 0;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ contain: "strict" }}
    >
      {images.map((img, i) => {
        const distance = Math.abs(progress - i);
        const opacity = Math.max(0, 1 - distance);
        const translateY = reducedMotion ? 0 : (scrollY - i * vh) * parallaxFactor * -1;
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
  );
}

"use client";

/**
 * Video parallax hero — slow-scroll decoupled video background.
 *
 * Why this exists separately from <ParallaxBackdrops>:
 *   - The original buckmountaincannabis.com hero is a looping video,
 *     not a still. Wrapping a <video> element in the same parallax
 *     transform that ParallaxBackdrops uses for stills lets us keep
 *     the skrollr feel without inheriting `background-attachment: fixed`
 *     (broken on mobile Safari).
 *
 * Behavior:
 *   - Video plays muted + looped + playsInline so iOS doesn't gate it.
 *   - As the user scrolls past the hero, the video translates Y at a
 *     fraction of scroll (parallaxFactor) so it appears to "stick" while
 *     foreground content slides over it.
 *   - When the hero leaves the viewport entirely, the video pauses to
 *     save battery (handled via IntersectionObserver).
 *   - prefers-reduced-motion: parallax disabled, video still plays but
 *     stays static. If the user has reduced-motion + autoplay-blocked,
 *     poster image shows.
 *
 * Drop-in usage:
 *   <VideoParallaxHero
 *     src="/assets/video/hero.mp4"
 *     poster="/assets/video/hero.jpg"
 *   />
 *
 * The video file is NOT in the repo yet — see handoff/asset-manifest.md.
 * Until it arrives, the component falls back to the poster. If the poster
 * also isn't there, the hero stays dark — the page still works.
 */

import { useEffect, useRef, useState } from "react";

export function VideoParallaxHero({
  src,
  poster,
  parallaxFactor = 0.15,
  // 2026-05-28: filters removed by default — show the raw drone footage.
  // The blur/brightness/saturate damp was from the "less cinematic" brief;
  // reverted per "restore to original content." Props kept so a future
  // section can opt back in, but defaults are identity (no filter applied).
  overlayOpacity = 0.4,
  videoBlurPx = 0,
  videoBrightness = 1,
  videoSaturate = 1,
  // 2026-06-10: hero no longer owns the whole viewport by default — a
  // sub-100svh height leaves the next section peeking above the fold so
  // visitors see there is more page without scrolling blind.
  heightClassName = "h-screen",
  children,
}: {
  src: string;
  poster?: string;
  parallaxFactor?: number;
  overlayOpacity?: number;
  videoBlurPx?: number;
  videoBrightness?: number;
  videoSaturate?: number;
  /** Tailwind height classes for the hero section, e.g. "h-[75svh] min-h-[480px]". */
  heightClassName?: string;
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  // The inner div that holds the video + scrims. The parallax + fadeaway
  // animate on THIS element via direct ref mutation — no React state on
  // scroll, no re-renders, no per-frame component reconciliation. Way
  // smoother than the old setScrollY pattern.
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Scroll-tied parallax + opacity fadeaway. Direct ref mutation — does
  // not call setState, so the component never re-renders during scroll.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (reducedMotion) {
      layer.style.transform = "";
      layer.style.opacity = "";
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      // Fade relative to the hero's OWN height (it may be sub-viewport
      // now), not the viewport: the video reaches 0 opacity just before
      // its bottom edge scrolls past, whatever height the hero renders.
      const heroH = heroRef.current?.offsetHeight || window.innerHeight || 1;
      const translateY = y * parallaxFactor * -1;
      const fadeProgress = Math.max(0, Math.min(1, y / (heroH * 0.85)));
      layer.style.transform = `translate3d(0, ${translateY}px, 0)`;
      layer.style.opacity = String(1 - fadeProgress);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [parallaxFactor, reducedMotion]);

  // Pause when offscreen — battery + cellular friendly.
  useEffect(() => {
    const v = videoRef.current;
    const h = heroRef.current;
    if (!v || !h) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().catch(() => {
            /* autoplay may be blocked; poster will show. */
          });
        } else {
          v.pause();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(h);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      className={`relative ${heightClassName} w-full overflow-hidden`}
      aria-label="Buck Mountain Cannabis hero"
    >
      <div
        ref={layerRef}
        className="absolute inset-0 will-change-transform"
        // Initial SSR style baseline. The scroll effect above takes over on
        // mount and updates transform + opacity via direct DOM mutation.
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          // Only build a filter string when something is actually non-identity.
          // At defaults this is undefined → no compositing filter, raw footage.
          style={
            videoBlurPx === 0 && videoBrightness === 1 && videoSaturate === 1
              ? undefined
              : {
                  filter: `blur(${videoBlurPx}px) brightness(${videoBrightness}) saturate(${videoSaturate})`,
                }
          }
          aria-hidden
        />
        {/* Soft top-and-bottom fade so the foreground content sits cleanly
            over the busiest frame regions. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.0) 65%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex h-full items-end p-8 md:p-16">
        {children}
      </div>
    </section>
  );
}

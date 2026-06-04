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
  children,
}: {
  src: string;
  poster?: string;
  parallaxFactor?: number;
  overlayOpacity?: number;
  videoBlurPx?: number;
  videoBrightness?: number;
  videoSaturate?: number;
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  // Stay at 0 + unmounted on SSR so the first client render matches the
  // server HTML byte-for-byte — eliminates the hydration mismatch React
  // was logging on every reload.
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!mounted || reducedMotion) return;
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
  }, [mounted, reducedMotion]);

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

  const translateY =
    !mounted || reducedMotion ? 0 : scrollY * parallaxFactor * -1;

  return (
    <section
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden"
      aria-label="Buck Mountain Cannabis hero"
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${translateY}px, 0)` }}
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

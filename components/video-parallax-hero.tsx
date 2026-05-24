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
  parallaxFactor = 0.25,
  overlayOpacity = 0.45,
  children,
}: {
  src: string;
  poster?: string;
  parallaxFactor?: number;
  overlayOpacity?: number;
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
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

  const translateY = reducedMotion ? 0 : scrollY * parallaxFactor * -1;

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
          aria-hidden
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

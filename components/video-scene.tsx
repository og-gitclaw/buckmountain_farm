"use client";

/**
 * VideoScene — full-viewport text section with a looping video background.
 *
 * Sibling of <VideoParallaxHero>:
 *   - No parallax math. The video sits behind text in a relative section,
 *     so scrolling moves both together. Cheap, doesn't fight mobile Safari.
 *   - IntersectionObserver pauses the video when offscreen to save battery
 *     + cellular bytes.
 *   - prefers-reduced-motion: video is paused at its poster frame and
 *     stays static. Foreground text is unaffected.
 *
 * Use when you want a section that feels alive (looping shot from the
 * spliced hero footage) but doesn't need the scroll-decoupled feel of
 * the top-of-page hero.
 *
 * Usage:
 *   <VideoScene
 *     src="/assets/video/hero-b-interior.mp4"
 *     poster="/assets/video/hero-poster.jpg"
 *     overlayOpacity={0.55}
 *     align="left" // or "center"
 *   >
 *     <h2>Hybrid Environments</h2>
 *     <p>…</p>
 *   </VideoScene>
 */

import { useEffect, useRef, useState } from "react";

export function VideoScene({
  src,
  poster,
  // 2026-05-28: filters removed by default — raw footage. Overlay kept
  // (lighter) so section text stays legible. Props retained for opt-in.
  overlayOpacity = 0.45,
  align = "left",
  videoBlurPx = 0,
  videoBrightness = 1,
  videoSaturate = 1,
  children,
}: {
  src: string;
  poster?: string;
  overlayOpacity?: number;
  align?: "left" | "center" | "right";
  videoBlurPx?: number;
  videoBrightness?: number;
  videoSaturate?: number;
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Pause when offscreen, play when in view. Calling play() on a
  // preload="none" video is what triggers the download, so this scene pulls
  // ZERO bytes on page land (poster only) and streams on demand exactly when
  // the visitor scrolls it into view — never competing with the hero on land.
  useEffect(() => {
    const v = videoRef.current;
    const h = sectionRef.current;
    if (!v || !h) return;
    if (reducedMotion) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().catch(() => {
            /* autoplay may be blocked on mobile data-saver; poster will show. */
          });
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(h);
    return () => io.disconnect();
  }, [reducedMotion]);

  const alignClass =
    align === "center"
      ? "items-center justify-center text-center"
      : align === "right"
        ? "items-end justify-end text-right"
        : "items-start justify-start text-left";

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full overflow-hidden"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        // No autoPlay + preload="none": the section shows its poster and
        // pulls zero video bytes until the load coordinator releases this
        // slot in the sequential chain. Playback is started imperatively by
        // the IntersectionObserver above once buffered + in view.
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
        style={
          videoBlurPx === 0 && videoBrightness === 1 && videoSaturate === 1
            ? undefined
            : {
                filter: `blur(${videoBlurPx}px) brightness(${videoBrightness}) saturate(${videoSaturate})`,
              }
        }
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden
      />
      {/* Top + bottom edge fade so the section reads as a panel, not
          a hard-edged movie frame. Stronger 0.95 → 0.55 → 0 stops than
          the original 0.55 → 0 so the section terminates in near-fully-
          black at each edge: when this VideoScene is enabled and butts
          up against another dark section, the hand-off reads as a clean
          gap, not a half-transparent bleed. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 8%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.55) 92%, rgba(0,0,0,0.95) 100%)",
        }}
      />
      <div
        className={`relative z-10 flex min-h-screen w-full p-8 md:p-16 ${alignClass}`}
      >
        <div className="max-w-3xl reveal-on-scroll">{children}</div>
      </div>
    </section>
  );
}

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
  overlayOpacity = 0.5,
  align = "left",
  children,
}: {
  src: string;
  poster?: string;
  overlayOpacity?: number;
  align?: "left" | "center" | "right";
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

  // Pause when offscreen. The whole point of splicing the hero into short
  // loops is that there are several on the page — we only want the visible
  // one decoding frames at any moment.
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
      <div
        className={`relative z-10 flex min-h-screen w-full p-8 md:p-16 ${alignClass}`}
      >
        <div className="max-w-3xl reveal-on-scroll">{children}</div>
      </div>
    </section>
  );
}

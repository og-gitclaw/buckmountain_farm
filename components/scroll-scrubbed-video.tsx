"use client";

/**
 * Scroll-scrubbed video — Apple-product-page style.
 *
 * The video's currentTime locks to the user's scroll position within the
 * section. Scroll down → video plays forward. Scroll back up → video
 * rewinds. The section pins itself for the duration of the playback so
 * the viewer "sees" the whole video as they scroll past.
 *
 * Effect: way more cinematic + intentional than autoplay-loop, but the
 * viewer never gets surprised because the video only moves when they do.
 * "Flashy but not overwhelming" — they control the pacing.
 *
 * Architecture:
 *   - Outer section is N viewport-heights tall so there's scroll runway
 *     (controlled by `lengthInVh`, default 3 → 3vh of scroll = play once)
 *   - Inner sticky container pins the video to viewport while you scroll
 *     past the runway
 *   - IntersectionObserver only attaches the scroll handler while the
 *     section is intersecting → cheap when offscreen
 *   - rAF-throttled scroll handler sets video.currentTime
 *   - On iOS Safari, video.fastSeek() is preferred if available (smoother)
 *
 * prefers-reduced-motion: video plays normally (autoplay/loop) and the
 * scroll handler is disabled.
 *
 * Caveats:
 *   - The video must be preloaded (`preload="auto"`) so seeking is instant
 *   - Use short clips (3-8s) — long videos require huge scroll runway
 *   - Encode as MP4 with frequent keyframes (every 0.5s) so fastSeek
 *     doesn't show keyframe-only black frames; ffmpeg `-g 15` works for
 *     30fps source. Document this in handoff/VIDEO_ENCODING.md.
 */

import { useEffect, useRef, useState } from "react";

export function ScrollScrubbedVideo({
  src,
  poster,
  lengthInVh = 3,
  overlayOpacity = 0.35,
  children,
}: {
  src: string;
  poster?: string;
  /** How many viewport-heights of scroll = one play-through of the video. */
  lengthInVh?: number;
  overlayOpacity?: number;
  children?: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Defer the actual <video src=...> assignment until the section is within
  // ~1 viewport of intersecting. `preload="auto"` then fetches enough buffer
  // for smooth fastSeek by the time the user reaches the section. This
  // prevents the b-roll MP4 from competing with the hero video for
  // HTTP-connection slots on first paint — the original "hero doesn't
  // autoplay on the homepage" complaint.
  const [srcArmed, setSrcArmed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrcArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    if (reducedMotion) {
      // Let the video play normally; don't touch currentTime on scroll.
      video.loop = true;
      video.play().catch(() => {
        /* autoplay blocked — poster stays */
      });
      return;
    }

    video.loop = false;
    video.pause();

    let raf = 0;
    let isIntersecting = false;

    const onScroll = () => {
      if (!isIntersecting || raf) return;
      raf = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh; // scrollable distance within the pinned section
        // progress from 0 (entering top) to 1 (leaving bottom)
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, total)));
        const duration = video.duration || 0;
        if (duration > 0) {
          const t = progress * duration;
          // fastSeek is smoother on Safari/iOS; falls back to currentTime
          if (typeof video.fastSeek === "function") {
            try {
              video.fastSeek(t);
            } catch {
              video.currentTime = t;
            }
          } else {
            video.currentTime = t;
          }
        }
        raf = 0;
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting) onScroll();
      },
      { threshold: 0 },
    );
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: `${lengthInVh * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          src={srcArmed ? src : undefined}
          poster={poster}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: overlayOpacity }}
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        <div className="relative z-10 h-full w-full flex items-center justify-center p-8 md:p-16">
          <div className="max-w-3xl">{children}</div>
        </div>
      </div>
    </section>
  );
}

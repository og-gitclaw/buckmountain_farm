"use client";

/**
 * useSmoothParallax — shared damped-scroll primitive for every parallax
 * layer on the site.
 *
 * Instead of snapping a layer's transform to the exact scroll-derived
 * value each frame (rigid, locked 1:1 to the wheel), this runs a
 * continuous rAF loop that LERPS a smoothed value toward the live
 * target:
 *
 *     current += (target - current) * ease
 *
 * The layer trails the scroll with a little inertia, so the motion reads
 * fluid and premium instead of welded to the scrollbar. One
 * implementation = one consistent feel across the hero, the Strain
 * Updates backdrop, and the philosophy card.
 *
 * The hook owns the fiddly parts so callers stay tiny + uniform:
 *   - the rAF lerp loop, started/stopped with element visibility
 *     (IntersectionObserver) and torn down on unmount;
 *   - prefers-reduced-motion: never animates, restores the static state
 *     via `reset`, and re-engages live if the user flips the setting;
 *   - settle + idle: once converged and the user stops scrolling the
 *     loop parks itself; a scroll/resize re-arms it (no idle CPU burn).
 *
 * SSR: everything runs inside the effect, so server output is untouched.
 * The caller's base/SSR styles must already BE the correct static state
 * (these components render with `transform: translate3d(0,0,0)`), so the
 * reduced-motion / pre-mount paint is correct with no work.
 *
 * Caller supplies:
 *   - triggerRef  : element observed for visibility + (usually) the rect
 *                   the target is measured from;
 *   - getTarget() : the raw, un-smoothed value from current layout. When
 *                   the measurement source is briefly unavailable (ref
 *                   detached), return the layer's REST value — for these
 *                   callers that is 0 — so a transient null can't jump it.
 *                   Keep its scale near output pixels so the fixed settle
 *                   epsilon stays sub-pixel;
 *   - apply(v)    : write the smoothed value to the DOM (transform and/or
 *                   opacity — the hero drives both from one scalar);
 *   - reset?()    : restore the static state (reduced-motion / teardown).
 *
 * getTarget/apply/reset may be inline closures — they are read through a
 * ref each frame, so the effect subscribes once and never re-binds on a
 * parent re-render.
 */

import { useEffect, useRef } from "react";

type SmoothParallaxArgs = {
  triggerRef: React.RefObject<HTMLElement | null>;
  getTarget: () => number;
  apply: (value: number) => void;
  reset?: () => void;
  /** Fraction of the remaining distance closed per ~16ms frame. At 0.12
   *  the half-life is ~90ms and the full settle tail runs ~600ms — a soft
   *  premium drift. Higher = snappier. */
  ease?: number;
  /** Set false to opt a caller out entirely. */
  enabled?: boolean;
};

export function useSmoothParallax({
  triggerRef,
  getTarget,
  apply,
  reset,
  ease = 0.12,
  enabled = true,
}: SmoothParallaxArgs) {
  // Latest callbacks, read per frame — keeps the effect a one-time subscribe.
  const cb = useRef({ getTarget, apply, reset });
  cb.current = { getTarget, apply, reset };

  useEffect(() => {
    if (!enabled) return;
    const el = triggerRef.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches;
    let raf = 0;
    let visible = false;
    let current = cb.current.getTarget();
    let settledFrames = 0;

    const frame = () => {
      const target = cb.current.getTarget();
      const diff = target - current;
      if (Math.abs(diff) < 0.05) {
        current = target; // settle exactly, then count down to idle
        settledFrames++;
      } else {
        current += diff * ease;
        settledFrames = 0;
      }
      cb.current.apply(current);
      // Keep the loop alive while visible and still moving; park once it
      // has been settled for a few frames (a scroll/resize re-arms it).
      if (visible && settledFrames < 3) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    };

    const arm = () => {
      if (reduced || !visible || raf) return;
      settledFrames = 0;
      raf = requestAnimationFrame(frame);
    };

    const onScroll = () => arm();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        // Snap to the live target on (re)entry so a layer that scrolled far
        // offscreen doesn't sweep across the frame when it returns. Skip the
        // write entirely under reduced motion — the element must keep its
        // static (reset) state, never a scroll-derived offset.
        if (visible && !reduced) {
          current = cb.current.getTarget();
          cb.current.apply(current);
          arm();
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const onMq = (e: MediaQueryListEvent) => {
      reduced = e.matches;
      if (reduced) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        cb.current.reset?.();
      } else {
        // Re-seed to the live target before resuming: while motion was off
        // the loop never ran, so `current` is stale and (esp. on the
        // always-visible hero, which never gets an IO re-entry to re-seed)
        // would sweep from its parked value toward the now-distant target.
        current = cb.current.getTarget();
        cb.current.apply(current);
        arm();
      }
    };
    mq.addEventListener?.("change", onMq);

    // Initial paint: static under reduced-motion, else seed at the target.
    if (reduced) {
      cb.current.reset?.();
    } else {
      cb.current.apply(current);
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener?.("change", onMq);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [triggerRef, ease, enabled]);
}

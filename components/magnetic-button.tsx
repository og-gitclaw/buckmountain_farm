"use client";

/**
 * Magnetic button — the cursor pulls the button toward it within a
 * radius, then snaps back on leave. Premium feel; no library.
 *
 * Use on key CTAs only (3-4 per page max) — the effect loses its
 * weight if everything wiggles.
 *
 * prefers-reduced-motion: disabled, renders as a plain button.
 * Touch devices: disabled (no `mousemove`); plain tap behavior.
 *
 * Forwards children + className so it composes with the existing
 * button styles instead of replacing them.
 */

import { useEffect, useRef, useState } from "react";

export function MagneticButton({
  href,
  onClick,
  type = "button",
  className = "",
  pull = 0.35,
  radius = 80,
  children,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  /** 0..1 — how strongly the button follows the cursor. */
  pull?: number;
  /** px — distance at which the magnet engages. */
  radius?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
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
    const el = ref.current;
    if (!el) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    function move(e: MouseEvent) {
      const node = el as HTMLElement;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        node.style.transform = "";
        return;
      }
      node.style.transform = `translate3d(${dx * pull}px, ${dy * pull}px, 0)`;
    }
    function leave() {
      (el as HTMLElement).style.transform = "";
    }
    window.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [pull, radius, reducedMotion]);

  const sharedProps = {
    ref: ref as React.Ref<never>,
    className: `inline-block transition-transform duration-150 will-change-transform ${className}`,
  };

  if (href) {
    return (
      <a {...sharedProps} href={href} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button {...sharedProps} type={type} onClick={onClick}>
      {children}
    </button>
  );
}

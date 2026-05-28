"use client";

/**
 * Draggable before/after comparison slider.
 *
 * Pure CSS clip-path approach with a single React state value (slider %).
 * No third-party libs. Touch + mouse + keyboard accessible.
 *
 * Both `before` and `after` are arbitrary React children so we can mix
 * real images, video, and inline UI mockups inside each side.
 */

import { useEffect, useRef, useState } from "react";

export function DragComparison({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  aspectRatio = "16 / 9",
  initial = 0.5,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string;
  initial?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = useState(initial);
  const dragging = useRef(false);

  function update(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = (clientX - r.left) / r.width;
    setPct(Math.max(0, Math.min(1, p)));
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging.current) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      update(x);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 select-none"
      style={{ aspectRatio }}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        update(e.touches[0].clientX);
      }}
    >
      {/* AFTER layer — fills the box; the BEFORE layer is clipped on top. */}
      <div className="absolute inset-0">{after}</div>
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pct * 100}% 0 0)` }}
      >
        {before}
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-white/30 bg-black/55 backdrop-blur text-white/90 pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-amber-400/50 bg-amber-500/15 backdrop-blur text-amber-100 pointer-events-none">
        {afterLabel}
      </span>

      {/* Drag handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-amber-300 pointer-events-none"
        style={{ left: `${pct * 100}%` }}
      />
      <div
        role="slider"
        aria-label="Drag to compare"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPct((p) => Math.max(0, p - 0.05));
          if (e.key === "ArrowRight") setPct((p) => Math.min(1, p + 0.05));
        }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-10 rounded-full bg-amber-300 text-black grid place-items-center shadow-lg cursor-ew-resize"
        style={{ left: `${pct * 100}%` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M9 6L3 12l6 6M15 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}

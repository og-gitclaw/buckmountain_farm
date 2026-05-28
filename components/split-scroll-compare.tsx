"use client";

/**
 * Synced split-pane scroll comparison.
 *
 * Left: a "legacy" mockup constructed from the ripped assets (we have
 * the original hero video, the gallery photos, and a sense of the IA
 * from the conversation — but no live access to the legacy DOM because
 * it's a JS-rendered SPA that returned empty to WebFetch).
 *
 * Right: a live iframe of the current homepage so any change to the
 * production site shows up here automatically.
 *
 * Both columns scroll together — when you scroll the page, both inner
 * panels advance through their content in tandem. Lets the visitor
 * see the "shape of the rebuild" instead of having to A/B click.
 *
 * Implementation: sticky-positioned section, two columns with their own
 * overflow:auto scroll. A scroll handler on the section drives both
 * inner panels by setting scrollTop based on page progress.
 */

import { useEffect, useRef } from "react";

export function SplitScrollCompare({
  legacy,
  modernSrc,
  lengthInVh = 4,
}: {
  legacy: React.ReactNode;
  /** URL for the right-side iframe (defaults to "/" so it shows current homepage). */
  modernSrc?: string;
  /** How many viewport-heights of scroll runway the comparison uses. */
  lengthInVh?: number;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const legacyRef = useRef<HTMLDivElement | null>(null);
  const modernRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const sec = sectionRef.current!;
        const rect = sec.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh;
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, total)));

        const leg = legacyRef.current;
        if (leg) {
          const max = leg.scrollHeight - leg.clientHeight;
          leg.scrollTop = max * progress;
        }
        const mod = modernRef.current;
        if (mod?.contentWindow) {
          try {
            const doc = mod.contentDocument!;
            const max = doc.documentElement.scrollHeight - mod.clientHeight;
            mod.contentWindow.scrollTo(0, max * progress);
          } catch {
            // Cross-origin: silently ignore. (Same-origin in our case.)
          }
        }
        raf = 0;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: `${lengthInVh * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-neutral-950">
        <div className="grid grid-cols-2 h-full w-full divide-x divide-white/15">
          {/* Legacy panel */}
          <div className="relative h-full bg-black overflow-hidden">
            <div className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full border border-white/30 bg-black/70 backdrop-blur text-white/85 pointer-events-none">
              Before · buckmountaincannabis.com
            </div>
            <div
              ref={legacyRef}
              className="h-full w-full overflow-hidden"
              style={{ pointerEvents: "none" }}
            >
              {legacy}
            </div>
          </div>

          {/* Modern panel (live iframe of /) */}
          <div className="relative h-full bg-black">
            <div className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-[0.25em] px-2 py-1 rounded-full border border-amber-400/60 bg-amber-500/20 backdrop-blur text-amber-100 pointer-events-none">
              After · buckmountain.farm
            </div>
            <iframe
              ref={modernRef}
              src={modernSrc ?? "/"}
              className="h-full w-full border-0"
              loading="lazy"
              title="Buck Mountain Cannabis live homepage"
              // Locking scroll inside so our scroll handler is the only
              // thing moving it. The user's own scroll moves the parent
              // page which we mirror into the iframe.
              sandbox="allow-same-origin allow-scripts"
              style={{ pointerEvents: "none" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

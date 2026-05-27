/**
 * Aurora mesh background — pure CSS animated gradient blobs.
 *
 * Three large radial gradients drift slowly across the viewport. The
 * combined effect is a low-key animated mesh that adds depth without
 * competing with foreground content. Sits BEHIND video/imagery as a
 * subtle color wash, or IN PLACE OF imagery on lighter sections.
 *
 * Brand tokens — gold + purple-frame + deep forest — keyed to the
 * Buck Mountain palette. Override via the `palette` prop for sister
 * sites (BMH, OG Life, cbd.restaurant, etc.).
 *
 * Cost: 0 JS, 0 network. Three CSS keyframes + transform: translate3d.
 * Hardware-accelerated, ~0.1% main-thread.
 *
 * Edge bleed (2026-05-27): the colored blob layer is masked with a
 * vertical gradient so the color fades in over the top ~22% of the
 * container and back out over the bottom ~22%. Stops the "framed"
 * look where the colored wash sharply starts and stops at the
 * section boundary. Set `bleed={false}` to disable if you want a
 * hard-edged colored panel.
 *
 * prefers-reduced-motion: stops the drift, but the static gradient
 * remains so the layout doesn't change.
 */

type Palette = { a: string; b: string; c: string; bg?: string };

const DEFAULT_PALETTE: Palette = {
  a: "#5B3A8A",   // purple-frame
  b: "#C9A24A",   // gold accent
  c: "#3E7C5F",   // forest (cannabis hint)
  bg: "#0a0a0a",  // base
};

export function AuroraMesh({
  palette = DEFAULT_PALETTE,
  intensity = 0.45,
  bleed = true,
  className = "",
  ariaHidden = true,
}: {
  palette?: Palette;
  /** 0..1 opacity of the drifting blobs (background stays solid). */
  intensity?: number;
  /** When true (default), fade the colored layer in/out at vertical
   *  edges so the wash bleeds into adjacent sections instead of looking
   *  like a hard-edged colored panel. */
  bleed?: boolean;
  className?: string;
  ariaHidden?: boolean;
}) {
  const i = Math.max(0, Math.min(1, intensity));
  // Soft vertical mask: invisible at the very top + bottom, full strength
  // through the middle band. Same shape used for -webkit-mask-image so
  // Safari renders identically.
  const mask = bleed
    ? "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 8%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.35) 92%, transparent 100%)"
    : undefined;

  return (
    <div
      aria-hidden={ariaHidden}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ background: palette.bg ?? "#0a0a0a" }}
    >
      <div
        className="absolute inset-0"
        style={
          mask
            ? {
                maskImage: mask,
                WebkitMaskImage: mask,
              }
            : undefined
        }
      >
        <div
          className="aurora-blob aurora-blob-a"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${palette.a}, transparent 60%)`,
            opacity: i,
          }}
        />
        <div
          className="aurora-blob aurora-blob-b"
          style={{
            background: `radial-gradient(circle at 70% 40%, ${palette.b}, transparent 55%)`,
            opacity: i * 0.85,
          }}
        />
        <div
          className="aurora-blob aurora-blob-c"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${palette.c}, transparent 60%)`,
            opacity: i * 0.7,
          }}
        />
      </div>
    </div>
  );
}

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
  className = "",
  ariaHidden = true,
}: {
  palette?: Palette;
  /** 0..1 opacity of the drifting blobs (background stays solid). */
  intensity?: number;
  className?: string;
  ariaHidden?: boolean;
}) {
  const i = Math.max(0, Math.min(1, intensity));
  return (
    <div
      aria-hidden={ariaHidden}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ background: palette.bg ?? "#0a0a0a" }}
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
  );
}

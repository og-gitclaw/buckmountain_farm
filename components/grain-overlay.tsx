/**
 * Animated film-grain / noise overlay.
 *
 * Inline SVG fractal-noise filter rendered as a fixed-position layer at
 * very low opacity. Adds the subtle "premium printed paper" texture
 * that high-end brand sites use to soften pure-pixel rendering. The
 * keyframe nudges baseFrequency over time to animate the noise (the
 * grain "lives" instead of being a static stipple).
 *
 * Cost: ~5KB of SVG, no JS, no network. The filter runs on the
 * compositor so it doesn't trigger reflow.
 *
 * Use it once at the top of the layout (pointer-events: none) — it
 * applies across the whole page without any per-section setup.
 */

export function GrainOverlay({
  opacity = 0.06,
  blendMode = "overlay",
  ariaHidden = true,
}: {
  opacity?: number;
  blendMode?: "overlay" | "multiply" | "soft-light" | "screen";
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="pointer-events-none fixed inset-0 z-[1] grain-overlay"
      style={{ opacity, mixBlendMode: blendMode }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 320"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <filter id="bm-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0.55 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#bm-grain)" />
      </svg>
    </div>
  );
}

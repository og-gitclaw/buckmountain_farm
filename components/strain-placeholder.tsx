/**
 * Procedural strain placeholder card.
 *
 * Renders an inline SVG keyed by the strain slug + family. Until real
 * photos land, this gives /strains and homepage cards a brand-consistent
 * look that doesn't read as "missing image" — it reads as art direction.
 *
 * The composition: family-tint radial gradient, soft grain noise
 * suggestion via overlapping circles, strain initial in heavy serif,
 * family label in small caps. Server-renderable (no client hooks).
 */

import { FAMILY_COLOR, type Strain } from "@/data/strains";

export function StrainPlaceholder({
  strain,
  className = "",
}: {
  strain: Pick<Strain, "slug" | "name" | "family" | "hero_color" | "type">;
  className?: string;
}) {
  const tint = strain.hero_color ?? FAMILY_COLOR[strain.family];
  const initial = (strain.name.match(/[A-Za-z0-9]/)?.[0] ?? "?").toUpperCase();
  // Deterministic positions derived from slug hash so each strain gets a
  // stable composition (not random-on-mount).
  const seed = hashSlug(strain.slug);
  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${strain.name} placeholder card`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`g-${strain.slug}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#g-${strain.slug})`} />
      {/* atmospheric blobs */}
      {[0, 1, 2, 3].map((i) => {
        const cx = 40 + ((seed + i * 53) % 240);
        const cy = 40 + ((seed + i * 79) % 160);
        const r = 30 + ((seed + i * 23) % 70);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={tint}
            opacity={0.08 + (i % 3) * 0.04}
          />
        );
      })}
      {/* center initial */}
      <text
        x="160"
        y="135"
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, 'Times New Roman', serif"
        fontSize="92"
        fontWeight="700"
        fill="#fafafa"
        opacity="0.92"
      >
        {initial}
      </text>
      {/* tiny strain label */}
      <text
        x="160"
        y="200"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="3"
        fill="#fafafa"
        opacity="0.7"
      >
        {strain.name.toUpperCase()}
      </text>
      <text
        x="160"
        y="220"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        letterSpacing="2.5"
        fill="#fafafa"
        opacity="0.45"
      >
        {strain.type.toUpperCase()}
      </text>
    </svg>
  );
}

function hashSlug(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

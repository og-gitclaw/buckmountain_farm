/**
 * Procedural strain placeholder.
 *
 * Two variants:
 *   - "card" (default) — complete standalone card with family-tinted
 *     gradient, atmospheric blobs, big serif initial, strain label,
 *     type label. Used on /strains where the placeholder IS the card.
 *   - "background" — gradient + atmospheric blobs only, no text.
 *     Used inside tiles (BentoStrainGrid, /drops cards) where the
 *     parent overlays its own headline so the placeholder must not
 *     compete.
 *
 * Server-renderable (no client hooks). Positions are deterministic
 * via slug hash so each strain has a stable composition.
 */

import { FAMILY_COLOR, type Strain } from "@/data/strains";

export function StrainPlaceholder({
  strain,
  variant = "card",
  className = "",
}: {
  strain: Pick<Strain, "slug" | "name" | "family" | "hero_color" | "type">;
  variant?: "card" | "background";
  className?: string;
}) {
  const tint = strain.hero_color ?? FAMILY_COLOR[strain.family];
  const initial = (strain.name.match(/[A-Za-z0-9]/)?.[0] ?? "?").toUpperCase();
  const seed = hashSlug(strain.slug);
  const isCard = variant === "card";

  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${strain.name} ${variant}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`g-${strain.slug}-${variant}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#g-${strain.slug}-${variant})`} />
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
      {isCard && (
        <>
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
        </>
      )}
    </svg>
  );
}

function hashSlug(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Procedural product placeholder for /store cards.
 *
 * Same brand language as StrainPlaceholder but tuned for merch — neutral
 * stage with line-art-y product silhouette suggestion + name banner. Renders
 * a cleaner inline SVG than the prior logo-on-gradient look.
 */

const LINE_PALETTE: Record<string, string> = {
  Apparel:      "#5B3A8A",
  "Tech Decks": "#A05CD9",
  Accessories:  "#8A6F2A",
  Default:      "#3E3E3E",
};

export function ProductPlaceholder({
  name,
  line,
  className = "",
}: {
  name: string;
  line: string;
  className?: string;
}) {
  const tint = LINE_PALETTE[line] ?? LINE_PALETTE.Default;
  const seed = hashName(name);
  const wordmark = name.toUpperCase();
  return (
    <svg
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${name} placeholder`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill={`url(#g-${seed})`} />
      {/* off-center tint disc */}
      <circle
        cx={120 + (seed % 60)}
        cy={140 + ((seed >> 4) % 50)}
        r={130}
        fill={tint}
        opacity="0.18"
      />
      {/* faint product silhouette (rounded rectangle = tee, square = deck) */}
      {line === "Tech Decks" ? (
        <rect
          x="120"
          y="120"
          width="80"
          height="200"
          rx="10"
          fill="#0a0a0a"
          opacity="0.55"
          transform="rotate(-15 160 220)"
        />
      ) : (
        <path
          d="M 100 110 L 90 130 L 110 145 L 110 240 L 210 240 L 210 145 L 230 130 L 220 110 L 195 110 Q 160 130 125 110 Z"
          fill="#0a0a0a"
          opacity="0.55"
        />
      )}
      {/* line label */}
      <text
        x="160"
        y="48"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="3"
        fill="#fafafa"
        opacity="0.55"
      >
        {line.toUpperCase()}
      </text>
      {/* product name banner */}
      <text
        x="160"
        y="290"
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, 'Times New Roman', serif"
        fontSize={wordmark.length > 22 ? 14 : 17}
        fontWeight="700"
        letterSpacing="1.5"
        fill="#fafafa"
        opacity="0.88"
      >
        {wordmark}
      </text>
    </svg>
  );
}

function hashName(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

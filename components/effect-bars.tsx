/**
 * Effect intensity bars (Leafly / BMH /clones style).
 *
 * Pass an EffectScores object; renders a labeled-bar list. Skips any
 * undefined effect cleanly. Bars are scaled 0–100; the fill color picks
 * up the brand accent gold with a per-row tint shift.
 *
 * Companion to <EffectTiles /> which renders the same data as colored
 * chips (for narrower spaces like card grids).
 */

import type { EffectScores } from "@/data/strains";

const LABELS: Record<keyof EffectScores, string> = {
  body: "Body",
  mind: "Mind",
  calm: "Calm",
  focus: "Focus",
  euphoria: "Euphoria",
  uplift: "Uplift",
};

const TINT: Record<keyof EffectScores, string> = {
  body:     "from-rose-500/70   to-rose-700/60",
  mind:     "from-sky-400/70    to-sky-600/60",
  calm:     "from-emerald-400/70 to-emerald-600/60",
  focus:    "from-amber-400/70  to-amber-600/60",
  euphoria: "from-fuchsia-400/70 to-fuchsia-600/60",
  uplift:   "from-yellow-300/70 to-yellow-500/60",
};

export function EffectBars({ scores }: { scores: EffectScores }) {
  const entries = (Object.entries(scores) as [keyof EffectScores, number][])
    .filter(([, v]) => typeof v === "number")
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
  if (entries.length === 0) return null;
  return (
    <dl className="space-y-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="flex items-baseline justify-between">
            <dt className="text-sm font-semibold text-white/85">{LABELS[k]}</dt>
            <dd className="text-xs tabular-nums text-white/55">{v}</dd>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${TINT[k]}`}
              style={{ width: `${Math.max(2, Math.min(100, v ?? 0))}%` }}
              aria-hidden
            />
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Chip variant — fits in tight card layouts. Top 3 effects, color-tinted.
 *  Compact size (10px type, low padding) so they read as quiet metadata,
 *  not a row of buttons. */
export function EffectTiles({ scores }: { scores?: EffectScores }) {
  if (!scores) return null;
  const top = (Object.entries(scores) as [keyof EffectScores, number][])
    .filter(([, v]) => typeof v === "number")
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 3);
  if (top.length === 0) return null;
  const COLOR: Record<keyof EffectScores, string> = {
    body:     "border-rose-500/40 text-rose-200",
    mind:     "border-sky-500/40 text-sky-200",
    calm:     "border-emerald-500/40 text-emerald-200",
    focus:    "border-amber-500/40 text-amber-200",
    euphoria: "border-fuchsia-500/40 text-fuchsia-200",
    uplift:   "border-yellow-500/40 text-yellow-200",
  };
  return (
    <ul className="flex flex-wrap gap-1">
      {top.map(([k, v]) => (
        <li
          key={k}
          className={`text-[10px] tracking-wider px-1.5 py-[2px] rounded-md border ${COLOR[k]} bg-black/35 backdrop-blur-sm whitespace-nowrap`}
        >
          {LABELS[k]} <span className="opacity-70">{v}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Homepage FX flags — diagnostic gating for every motion / background layer
 * below the hero. Read by app/page.tsx from the `fx` query param so each
 * section can be flipped on/off without a redeploy.
 *
 * Sections graduate from the diagnostic queue by being added to DEFAULT_ON:
 * they then render on the plain URL but can still be killed instantly via
 * the corner pill if a regression shows up.
 *
 * Use: /                        -> DEFAULT_ON sections (hero is always on)
 *      /?fx=none                -> bare baseline (only hero)
 *      /?fx=strain-bg,interior  -> exactly these two (explicit list wins)
 *      /?fx=all                 -> everything on (legacy homepage)
 *
 * Add a flag here, gate its render in app/page.tsx, and the corner status
 * pill in components/fx-status-indicator.tsx auto-lists it.
 *
 * Diagnostic only — when the "phantom multimedia" investigation finishes,
 * this file + the indicator + the gating in app/page.tsx can be deleted in
 * one PR and the homepage returns to default-all-on.
 */

export const FX_KEYS = [
  "strain-bg",     // <StrainUpdatesBackdrop> behind the strain update cards
  "interior",      // <FramedVideoCard> "Inside the room."
  "hoop",          // <VideoScene> "Outdoor Hoop Dreams"
  "philosophy",    // <ParallaxImageBreather> hand-trim still + philosophy copy
  "foothills",     // <VideoScene> "A Legacy Cultivation Story"
  "bento",         // <BentoStrainGrid> tile cluster
  "aurora",        // <AuroraMesh> behind the FAQ
  "parallax-bg",   // <ParallaxBackdrops> behind the FAQ
] as const;

export type FxKey = (typeof FX_KEYS)[number];
export type FxFlags = Record<FxKey, boolean>;

/** Sections verified clean during the phantom-multimedia investigation.
 *  These render on the plain URL. Order of graduation:
 *    2026-06-09  strain-bg  (hero fadeaway + flicker fix verified first) */
export const DEFAULT_ON: readonly FxKey[] = ["strain-bg"];

export function parseFxFlags(raw: string | string[] | undefined): FxFlags {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const tokens = text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // No fx param at all -> the graduated defaults.
  if (tokens.length === 0) {
    const on = new Set(DEFAULT_ON);
    return Object.fromEntries(
      FX_KEYS.map((k) => [k, on.has(k)]),
    ) as FxFlags;
  }

  // Explicit param fully specifies the state: "none" = bare baseline,
  // "all" = everything, otherwise exactly the listed keys.
  const all = tokens.includes("all");
  const none = tokens.includes("none");
  const set = new Set(tokens);
  return Object.fromEntries(
    FX_KEYS.map((k) => [k, all || (!none && set.has(k))]),
  ) as FxFlags;
}

export function activeKeys(flags: FxFlags): FxKey[] {
  return FX_KEYS.filter((k) => flags[k]);
}

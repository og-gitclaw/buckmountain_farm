/**
 * Homepage FX flags — diagnostic gating for every motion / background layer
 * below the hero. Read by app/page.tsx from the `fx` query param so each
 * section can be flipped on/off without a redeploy.
 *
 * Use: /                            -> baseline (only hero)
 *      /?fx=strain-bg              -> add the flower-bud parallax
 *      /?fx=strain-bg,interior     -> add the Inside-the-Room scrub video
 *      /?fx=all                    -> everything on (legacy homepage)
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
  "interior",      // <ScrollScrubbedVideo> "Inside the room."
  "hoop",          // <VideoScene> "Outdoor Hoop Dreams"
  "foothills",     // <VideoScene> "A Legacy Cultivation Story"
  "bento",         // <BentoStrainGrid> tile cluster
  "aurora",        // <AuroraMesh> behind the FAQ
  "parallax-bg",   // <ParallaxBackdrops> behind the FAQ
] as const;

export type FxKey = (typeof FX_KEYS)[number];
export type FxFlags = Record<FxKey, boolean>;

export function parseFxFlags(raw: string | string[] | undefined): FxFlags {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const tokens = text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const all = tokens.includes("all");
  const set = new Set(tokens);
  return Object.fromEntries(
    FX_KEYS.map((k) => [k, all || set.has(k)]),
  ) as FxFlags;
}

export function activeKeys(flags: FxFlags): FxKey[] {
  return FX_KEYS.filter((k) => flags[k]);
}

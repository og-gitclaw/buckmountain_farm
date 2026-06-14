/**
 * Strain seed data — sourced from docs/research/strain-seo-matrix.md +
 * 2026-05-26 expansion to Leafly-style schema (effect %, family, parents,
 * hero color tokens). Replaces the prior shape; keep extensions backward
 * compatible because /strains/[slug] reads optional fields.
 *
 * One row per strain in the current inventory. Static file so /strains
 * and /strains/[slug] render without a DB connection. Once Neon's
 * `strains` table is seeded, replace this with `SELECT * FROM strains`.
 */

export type StrainType =
  | "indica"
  | "sativa"
  | "hybrid"
  | "indica-dominant"
  | "sativa-dominant";

export type StrainFamily =
  | "OG / Kush"
  | "Dessert / Fruit"
  | "Fuel / Resin"
  | "Bright / Gas"
  | "Hash / Resin"
  | "Other";

/** Effect intensities 0–100 for the bar UI (Leafly-style). */
export type EffectScores = {
  body?: number;
  mind?: number;
  calm?: number;
  focus?: number;
  euphoria?: number;
  uplift?: number;
};

export type Strain = {
  slug: string;
  name: string;
  type: StrainType;
  family: StrainFamily;
  lineage?: string;                       // human-readable, e.g. "X × Y"
  parents?: string[];                     // ["sunset-sherbet", "thin-mint-gsc"] (slugs, may not be in our catalog)
  effects?: string[];                     // narrative effect words
  effect_scores?: EffectScores;           // 0–100 bars
  flavors?: string[];
  category: "flower-light-assist" | "flower-exotic" | "concentrate" | "vape";
  short_description: string;
  long_description: string;
  thc_typical_pct?: number;
  cbd_typical_pct?: number;
  /** Hero asset for the strain card / detail. When absent the
   *  StrainPlaceholder component renders a procedural SVG using
   *  hero_color as the tint. */
  hero_image_url?: string | null;
  hero_color?: string;                    // hex; falls back to family default
  /** Cinematic strain-preview derivatives published by chl0e via
   *  POST /api/admin/assets (see handoff/CINEMATIC_STRAIN_PREVIEWS.md).
   *  All three are independently optional — components fall back to
   *  hero_image_url / StrainPlaceholder when a field is null. */
  poster_url?: string | null;             // still, first paint + reduced-motion
  tile_loop_url?: string | null;          // <=5s muted loop, /strains tiles
  cinematic_url?: string | null;          // 12-18s composite, /strains/[slug] hero
  /** Per-family default tints (purple-ish for indica, gold-ish for hybrid,
   *  green-ish for sativa). Used by the placeholder. */
  research_status: "needs-cultivator" | "needs-research" | "label-only" | "ready";
};

export const FAMILY_COLOR: Record<StrainFamily, string> = {
  "OG / Kush":      "#5B3A8A",
  "Dessert / Fruit": "#A05CD9",
  "Fuel / Resin":   "#8A6F2A",
  "Bright / Gas":   "#3E7C5F",
  "Hash / Resin":   "#5A4318",
  Other:            "#444444",
};

export const STRAINS: Strain[] = [
  {
    slug: "gelato-41",
    name: "Gelato 41",
    type: "hybrid",
    family: "Dessert / Fruit",
    lineage: "Sunset Sherbet × Thin Mint GSC pheno #41",
    parents: ["sunset-sherbet", "thin-mint-gsc"],
    effects: ["euphoric", "creative", "relaxed"],
    effect_scores: { body: 62, mind: 58, calm: 60, focus: 40, euphoria: 78, uplift: 65 },
    flavors: ["sweet cream", "citrus zest", "berry"],
    category: "flower-light-assist",
    short_description:
      "The 41 pheno — leans creamy, hits even. Light-assist run dials it in without losing the dessert nose.",
    long_description:
      "Gelato 41 is the dessert-cut everyone learned the brand around. Our light-assist indoor run leans into the sweet-cream + citrus side of the profile rather than chasing density. Hand-trimmed, slow-dried, jarred for cure before going out the door.",
    thc_typical_pct: 26,
    research_status: "needs-research",
  },
  {
    slug: "permanent-og",
    name: "Permanent OG",
    type: "indica-dominant",
    family: "OG / Kush",
    lineage: "Permanent Marker × OG Kush (presumed)",
    parents: ["permanent-marker", "og-kush"],
    effects: ["sedative", "pain-relief", "body-heavy"],
    effect_scores: { body: 88, mind: 32, calm: 84, focus: 24, euphoria: 60, uplift: 18 },
    flavors: ["gas", "pine", "earthy"],
    category: "flower-light-assist",
    short_description:
      "Heavy. Sleep-cut OG cross — the one you reach for after a long week in the hoops.",
    long_description:
      "Permanent OG hits with the classic gas-and-pine front but resolves into a relaxed body weight that's distinctively this cross. Best-in-class for end-of-day flower. We run it in the light-assist indoor room so the trichome density holds even in shoulder seasons.",
    thc_typical_pct: 28,
    research_status: "needs-research",
  },
  {
    slug: "grape-lobster",
    name: "Grape Lobster",
    type: "hybrid",
    family: "Dessert / Fruit",
    effects: ["calm", "happy"],
    effect_scores: { body: 55, mind: 50, calm: 70, focus: 38, euphoria: 65, uplift: 50 },
    flavors: ["grape candy", "berry"],
    category: "flower-exotic",
    short_description: "Exotic indoor — grape candy front, mellow finish.",
    long_description:
      "Grape Lobster is one of two 'Lobster' phenos we keep in the exotic indoor rotation. The grape-candy nose is unmistakable; the smoke is smooth and undemanding.",
    research_status: "needs-cultivator",
  },
  {
    slug: "strawberry-lobster",
    name: "Strawberry Lobster",
    type: "hybrid",
    family: "Dessert / Fruit",
    effects: ["uplifting", "social"],
    effect_scores: { body: 40, mind: 65, calm: 50, focus: 60, euphoria: 70, uplift: 78 },
    flavors: ["strawberry", "cream"],
    category: "flower-exotic",
    short_description:
      "Exotic indoor sibling to Grape Lobster — strawberries-and-cream forward.",
    long_description:
      "Strawberry Lobster reads sweeter and more daytime-friendly than its sister cross. Sister-pheno energy from the same exotic indoor room.",
    research_status: "needs-cultivator",
  },
  {
    slug: "yeet",
    name: "YEET",
    type: "hybrid",
    family: "Bright / Gas",
    effect_scores: { body: 50, mind: 70, calm: 38, focus: 65, euphoria: 72, uplift: 78 },
    category: "flower-light-assist",
    short_description: "House drop — fast-acting, loud terps.",
    long_description:
      "YEET is one of the in-house cuts. Loud terps, fast onset, daytime-leaning. Light-assist indoor.",
    research_status: "needs-cultivator",
  },
  {
    slug: "permanent-marker",
    name: "Permanent Marker",
    type: "hybrid",
    family: "Dessert / Fruit",
    lineage: "Biscotti × Jealousy × Sherb BX1 (Seed Junky)",
    parents: ["biscotti", "jealousy", "sherb-bx1"],
    effects: ["euphoric", "social"],
    effect_scores: { body: 60, mind: 65, calm: 55, focus: 50, euphoria: 82, uplift: 68 },
    flavors: ["sweet biscotti", "fuel"],
    category: "flower-light-assist",
    short_description:
      "Seed Junky's Biscotti × Jealousy × Sherb BX1 — sweet + fuel.",
    long_description:
      "Permanent Marker is Seed Junky's loud cross — dessert front with a fuel back. Our light-assist run keeps trichome production high without burning past the sweet phase.",
    thc_typical_pct: 27,
    research_status: "needs-research",
  },
  {
    slug: "dog",
    name: "DOG",
    type: "hybrid",
    family: "OG / Kush",
    effect_scores: { body: 72, mind: 40, calm: 70, focus: 30, euphoria: 60, uplift: 35 },
    category: "flower-light-assist",
    short_description: "Headstash variant — strong body.",
    long_description:
      "The DOG cut, light-assist indoor. Strong body weight, classic kush nose.",
    research_status: "needs-cultivator",
  },
  {
    slug: "xxx-og",
    name: "XXX OG",
    type: "indica-dominant",
    family: "OG / Kush",
    lineage: "OG Kush XXX cut",
    parents: ["og-kush"],
    effect_scores: { body: 84, mind: 30, calm: 80, focus: 22, euphoria: 58, uplift: 20 },
    category: "flower-light-assist",
    short_description: "OG Kush triple-X cut — body-heavy, classic gas.",
    long_description:
      "XXX OG is the triple-X selection of the OG Kush line — classic gas, body-leaning, evening flower.",
    research_status: "needs-research",
  },
  {
    slug: "jifflez",
    name: "Jifflez",
    type: "hybrid",
    family: "Other",
    effect_scores: { body: 55, mind: 55, calm: 55, focus: 50, euphoria: 60, uplift: 55 },
    category: "flower-light-assist",
    short_description: "House cut — balanced.",
    long_description:
      "Jifflez runs balanced across the day — daytime to evening with no strong push either way.",
    research_status: "needs-cultivator",
  },
  {
    slug: "hashberger",
    name: "Hashberger",
    type: "indica-dominant",
    family: "Hash / Resin",
    effect_scores: { body: 76, mind: 42, calm: 72, focus: 28, euphoria: 62, uplift: 30 },
    category: "flower-light-assist",
    short_description:
      "Hash-plant variant. Also pressed into badder concentrate.",
    long_description:
      "Hashberger doubles for us — light-assist flower AND the base genetic for the badder line. Reads hash-y and resinous.",
    research_status: "needs-cultivator",
  },
  {
    slug: "cheetah-piss",
    name: "Cheetah Piss",
    type: "hybrid",
    family: "Bright / Gas",
    lineage: "Lemonnade × Gelato 42 × London Pound Cake 97 (Cookies)",
    parents: ["lemonnade", "gelato-42", "london-pound-cake-97"],
    effects: ["uplifting", "alert"],
    effect_scores: { body: 45, mind: 78, calm: 35, focus: 70, euphoria: 75, uplift: 82 },
    flavors: ["citrus", "ammonia-funk", "sweet"],
    category: "flower-light-assist",
    short_description:
      "Cookies cross — bright citrus front, funky finish. Loud, in a small dose.",
    long_description:
      "Cheetah Piss is the loud Cookies cross — citrus-and-ammonia front, sweet finish. Daytime-leaning, fast-acting. Cult cut.",
    thc_typical_pct: 25,
    research_status: "needs-research",
  },
];

export function getStrain(slug: string): Strain | null {
  return STRAINS.find((s) => s.slug === slug) ?? null;
}

/** Quick client-side search index — used by the nav search component. */
export type StrainSearchEntry = {
  slug: string;
  name: string;
  type: string;
  family: string;
  haystack: string;                       // lowercased searchable blob
};

export const STRAIN_SEARCH_INDEX: StrainSearchEntry[] = STRAINS.map((s) => ({
  slug: s.slug,
  name: s.name,
  type: s.type,
  family: s.family,
  haystack: [
    s.name,
    s.slug,
    s.type,
    s.family,
    s.lineage ?? "",
    s.short_description,
    (s.flavors ?? []).join(" "),
    (s.effects ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase(),
}));

/**
 * Strain seed data — sourced from docs/research/strain-seo-matrix.md.
 *
 * One row per strain in the current inventory. This is a static file
 * so `/strains` and `/strains/[slug]` render without a DB connection.
 * Once Neon lands, replace these read paths with `SELECT * FROM strains`.
 *
 * Keep this file in sync with the matrix doc — whenever the matrix
 * adds a strain, mirror it here.
 */

export type StrainType =
  | "indica"
  | "sativa"
  | "hybrid"
  | "indica-dominant"
  | "sativa-dominant";

export type Strain = {
  slug: string;
  name: string;
  type: StrainType;
  lineage?: string;
  effects?: string[];
  flavors?: string[];
  category: "flower-light-assist" | "flower-exotic" | "concentrate" | "vape";
  short_description: string;
  long_description: string;
  thc_typical_pct?: number;
  cbd_typical_pct?: number;
  research_status: "needs-cultivator" | "needs-research" | "label-only" | "ready";
};

export const STRAINS: Strain[] = [
  {
    slug: "gelato-41",
    name: "Gelato 41",
    type: "hybrid",
    lineage: "Sunset Sherbet × Thin Mint GSC pheno #41",
    effects: ["euphoric", "creative", "relaxed"],
    flavors: ["sweet cream", "citrus zest", "berry"],
    category: "flower-light-assist",
    short_description:
      "The 41 pheno — leans creamy, hits even. Our light-assist run dials it in without losing the dessert nose.",
    long_description:
      "Gelato 41 is the dessert-cut everyone learned the brand around. Our light-assist indoor run leans into the sweet-cream + citrus side of the profile rather than chasing density. Hand-trimmed, slow-dried, jarred for cure before going out the door.",
    thc_typical_pct: 26,
    research_status: "needs-research",
  },
  {
    slug: "permanent-og",
    name: "Permanent OG",
    type: "indica-dominant",
    lineage: "Permanent Marker × OG Kush (presumed)",
    effects: ["sedative", "pain-relief", "body-heavy"],
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
    effects: ["calm", "happy"],
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
    effects: ["uplifting", "social"],
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
    lineage: "Biscotti × Jealousy × Sherb BX1 (Seed Junky)",
    effects: ["euphoric", "social"],
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
    lineage: "OG Kush XXX cut",
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
    lineage: "Lemonnade × Gelato 42 × London Pound Cake 97 (Cookies)",
    effects: ["uplifting", "alert"],
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

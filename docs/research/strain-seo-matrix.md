# Strain SEO Matrix — Buck Mountain Cannabis

Source CSV: `~/Downloads/products-2026-05-18.csv` (24 products, brand="B M",
exported 2026-05-18 from BigCommerce / cbd.restaurant).

Per project rule: each strain needs a canonical page on buckmountain.farm
(`/strains/<slug>`) with original copy + Leafly + Weedmaps + seedfinder.eu
cross-references. NEVER copy verbatim from those sources — synthesize.

## Strains in current inventory

| Strain | Category | CSV product IDs | Slug | Lineage (research) | Leafly | Weedmaps | SeedFinder | Status |
|---|---|---|---|---|---|---|---|---|
| Gelato 41 | flower (light-assist indoor) | 485 | `gelato-41` | Sunset Sherbet × Thin Mint GSC pheno | TODO | TODO | TODO | needs research |
| Permanent OG | flower (light-assist indoor) | 486 | `permanent-og` | Permanent Marker × OG Kush (presumed) | TODO | TODO | TODO | needs research |
| Grape Lobster | flower (EXOTIC indoor) | 487 | `grape-lobster` | unknown — verify w/ cultivator | TODO | TODO | TODO | needs cultivator |
| Strawberry Lobster | flower (EXOTIC indoor) | 488 | `strawberry-lobster` | unknown — verify w/ cultivator | TODO | TODO | TODO | needs cultivator |
| YEET | flower (light-assist indoor) | 489 | `yeet` | unknown | TODO | TODO | TODO | needs cultivator |
| Permanent Marker | flower (light-assist indoor) | 490 | `permanent-marker` | Biscotti × Jealousy × Sherb BX1 (Seed Junky) | TODO | TODO | TODO | needs research |
| DOG | flower (light-assist indoor) | 491 | `dog` | DOG OG / Headstash variant? — verify | TODO | TODO | TODO | needs cultivator |
| XXX OG | flower (light-assist indoor) | 492 | `xxx-og` | OG Kush XXX cut | TODO | TODO | TODO | needs research |
| Jifflez | flower (light-assist indoor) | 493 | `jifflez` | unknown | TODO | TODO | TODO | needs cultivator |
| Hashberger | flower (light-assist indoor) + concentrate | 494, 497 | `hashberger` | unknown — Hashplant × ? | TODO | TODO | TODO | needs cultivator |
| Cheetah Piss | flower (light-assist indoor) | 495 | `cheetah-piss` | Lemonnade × Gelato 42 × London Pound Cake 97 (Cookies) | TODO | TODO | TODO | needs research |
| Mix (badder) | concentrate | 498 | `badder-mix` | blend SKU | n/a | n/a | n/a | label only |
| Candy Mix (badder) | concentrate | 499 | `badder-candy-mix` | blend SKU | n/a | n/a | n/a | label only |
| Fiestas (badder) | concentrate | 500 | `badder-fiestas` | unknown | TODO | TODO | TODO | needs cultivator |
| Gelato 41 × Hashberger (badder) | concentrate | 501 | `badder-gelato-41-x-hashberger` | cross-extract | n/a | n/a | n/a | label only |
| Watermelon Punch (badder) | concentrate | 502 | `badder-watermelon-punch` | unknown | TODO | TODO | TODO | needs cultivator |
| Watermelon Punch × Mix (badder) | concentrate | 503 | `badder-watermelon-punch-x-mix` | blend SKU | n/a | n/a | n/a | label only |
| Award-Winning Rosin (Cold-Pressed) | vape | 484 | `rosin-vape-half-gram` | strain unspecified on SKU | n/a | n/a | n/a | needs cultivator |

## Category split

- **Flower (light-assist indoor):** Gelato 41, Permanent OG, YEET, Permanent Marker, DOG, XXX OG, Jifflez, Hashberger, Cheetah Piss
- **Flower (EXOTIC indoor):** Grape Lobster, Strawberry Lobster
- **Concentrates (badder):** Hashberger, Mix, Candy Mix, Fiestas, Gelato 41 × Hashberger, Watermelon Punch, Watermelon Punch × Mix
- **Vape:** Award-Winning Cold-Pressed Rosin Disposable

Categories Brendon called out that need URL space even if empty:
`flower`, `rosin`, `extracts`, `trim`, `smalls`, `pharmaceuticals (coming soon)`.

## Research checklist per strain (when assets land)

For each strain, before the page goes live, gather:

1. **Lineage** — verified parents (cultivator-confirmed > seedbank > Leafly)
2. **Terpene dominance** — caryophyllene/limonene/myrcene/linalool/pinene
3. **Effect profile** — 3-5 tags (e.g. "couch-locked", "cerebral", "social")
4. **Flavor profile** — 3-5 tags (gas, cream, fruit, citrus, earth)
5. **Originator credit** — name and link the breeder when known
6. **Hero shot** — bud macro (from openclaw watcher's `strain-still` tagged assets)
7. **Lifestyle shot** — jar in hand / outdoor / skate (if available)
8. **Proof-of-life clip** — short loop video if cultivator sent one
9. **COA** — Metrc-linked PDF, link from `/strains/<slug>` to `/batches/<tag>/coa`
10. **Internal copy** — 2-3 paragraphs original, hits primary keyword
   ("<strain> California", "<strain> light-assist indoor", "Buck Mountain <strain>")

## Page template (per strain)

```
URL:        buckmountain.farm/strains/<slug>
Title:      <Strain Name> · Buck Mountain Cannabis (Sierra Foothills, CA)
Schema.org: Product + Article (so it appears in product carousels AND knowledge panels)
Sections:
  1. Hero (parallax video/photo + strain name + one-line vibe)
  2. Lineage diagram (visual: parent A × parent B)
  3. Terpene / effect / flavor pills
  4. "Why we grow it" — cultivator quote (needs Randy/team input)
  5. Latest batch — COA + harvest date + Metrc tag
  6. Buy (where to find at retail — Nabis-derived retailer list)
  7. Gallery — assets from openclaw, tagged this strain
  8. Related strains (lineage-aware)
```

## Cross-links to build

- `/flower` → list of all flower strains (filterable by indoor type)
- `/extracts/badder` → list of all badder SKUs
- `/blog/<post>` → reference strains by `<slug>` for backlinks
- `/retailers` → Nabis-fed list, each retailer page shows which strains they currently stock

# Asset Manifest — buckmountain.farm

Running notes on assets ingested, identified, or needed.

## Live ingestion (openclaw watcher)

- **Source:** `iamclaw@100.88.89.39:~/openclaw-media-ingestor/buckmountain/`
- **Manifest file:** `iamclaw@100.88.89.39:~/Library/Application Support/buckmountain-farm/manifest.jsonl`
- **Cadence:** 30s poll
- **Status:** running as launchd job `com.buckmountain.farm.media-watcher`
- **Test record (proof of life):** id `e5f2cfc730f0695b`, file `Buck_Mtn_Gelato_41_jar_test_*.jpg`, tag `jar-shot`, route `trusted`

## Existing assets (from buckmountaincannabis.com screenshots)

| What | Where seen | Likely filename | Captured? |
|---|---|---|---|
| Hero loop background video (bud closeup, blurry green/pink) | homepage | unknown — JS-rendered | no |
| "Hybrid Environments" backdrop (purple bud, blurred greenhouse) | homepage section 2 | unknown | no |
| "Outdoor Hoop Dreams" split-image (two buds side by side) | homepage section 3 | unknown | no |
| "Always Grinding" merch tee photo | homepage section | unknown | no |
| Skateboarder doing trick on trampoline edge | homepage section | unknown | no |
| Woman in BMC hat trimming plants | homepage section | unknown | no |
| Greenhouse 4-up gallery (4 small images) | homepage section | unknown | no |
| FAQ panel | homepage section | text only | n/a |

Need to do a real rip via Chrome MCP since WebFetch only returned `/images/hero.jpg`. The site is JS-rendered (likely a Squarespace/Webflow build).

## Existing assets (from BigCommerce CSV)

The product CSV references images at `http://cbd.restaurant/product_images/...`. These ARE rippable (CSV gives direct URLs). 24 product images available.

Sample (one per strain, paths shortened):

- 484 — Buck_Mtn_.5g_100_Pressed_Rosin_Disposable_Vape_pen__50620.jpg
- 485 — Buck_Mtn_Light_Assist_FIRE_Indoor_Bud_Cannabis_Flowers_G41_still__66487.jpg
- 486 — Buck_Mtn_EXOTIC_FIRE_Indoor_Bud_Cannabis_Flowers_Permanent_OG_still__43793.jpg
- 487 — Buck_Mtn_EXOTIC_FIRE_Indoor_Bud_Cannabis_Flowers_Grape_Lobster_still__58548.jpg
- 488 — Buck_Mtn_EXOTIC_FIRE_Indoor_Bud_Cannabis_Flowers_Strawberry_Lobster_still__24628.jpg
- 489-495 — various Light Assist Indoor stills
- 497-503 — Cannabis Extracts (badder) jar shots
- (full list in CSV)

These are LOW PRIORITY to rip — they live on cbd.restaurant which is currently online, and we can hot-link via next/image during dev. Plan: rip at build time once Vercel Blob is provisioned, store under `/public/assets/products/<sku>/`.

## What we still need (cultivator drop)

- [ ] Hero loop video re-master (something less overwhelming than the current bud closeup — Brendon's directive)
- [ ] Per-strain "proof-of-life" video (one per strain — see strain-seo-matrix.md)
- [ ] Per-strain bud macro hero
- [ ] Jar label photography (current Buck Mtn jar designs)
- [ ] NEW rosin jar photography (incoming next week per Brendon)
- [ ] Cultivation facility b-roll (greenhouse rows, hoop houses, drying room, trim crew)
- [ ] Team photos / candids (currently nothing on the public site — need at least one founder shot)
- [ ] Skate / lifestyle content for "Always Grinding" through-line

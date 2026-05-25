# Legacy Site Rip — One-Command Runbook

Headless Chromium scrape of buckmountaincannabis.com. Run from openclaw
(or any home-machine dev box with Node 18+):

```bash
cd ~/buckmountain_farm
node scripts/rip_legacy.mjs
```

First run installs Playwright Chromium (~150MB, cached). Total runtime
~3–5 minutes depending on the legacy host's response speed.

## What it captures

| Output | Path | Purpose |
|---|---|---|
| Hero + background videos | `public/assets/ripped/raw/video_*.mp4` | Move keepers to `public/assets/video/hero.mp4` |
| Backdrop images >800px | `public/assets/ripped/raw/img_*.{jpg,png}` | Move keepers to `public/assets/backdrops/01..05.jpg` |
| Mobile + desktop screenshots, 5 scroll positions | `public/assets/ripped/screenshots/*.png` | Side-by-side QA archive (gitignored — too big to commit) |
| Per-page DOM scrape (title, meta, links, text first 1500ch) | `public/assets/ripped/pages/*.json` | SEO continuity reference (committed) |
| Scroll/parallax-related CSS rules | inside `manifest.json` | Replicate animation timing in our build |
| Sitemap URL list | inside `manifest.json` | Drives the per-page walk |
| `robots.txt` + `sitemap.xml` raw | `public/assets/ripped/{robots,sitemap}.xml` | Reference for the legacy crawl-budget posture |
| Full run summary | `public/assets/ripped/manifest.json` | Single-file audit trail (committed) |

## Side-by-side QA flow

After the rip:

1. `open public/assets/ripped/screenshots/` — sanity-check the 5 mobile
   + 5 desktop shots
2. `npm run dev` in another terminal — load
   http://localhost:3000 in Chrome
3. Pop the two side-by-side at the same scroll position; the playbook
   in `handoff/CHROME_MCP_RIP_PLAYBOOK.md` lists what to verify

## Promoting captured assets

```bash
# Inspect manifest.json -> find the hero video
cat public/assets/ripped/manifest.json | jq '.videos'

# Move the cleanest into the brand slot
cp public/assets/ripped/raw/video_<best>.mp4 public/assets/video/hero.mp4
# And generate a poster from frame 1
ffmpeg -i public/assets/video/hero.mp4 -ss 1 -frames:v 1 public/assets/video/hero-poster.jpg

# Same for backdrops
cp public/assets/ripped/raw/img_<hybrid>.jpg public/assets/backdrops/01-hybrid.jpg
# … repeat for 02-hoop, 03-cultivation, 04-jars, 05-skate
```

Then `git add public/assets/video/ public/assets/backdrops/ && git commit -m "rip: real legacy assets"`.

## Re-running

The script is idempotent — files that already exist in
`public/assets/ripped/raw/` are skipped. Re-run after the legacy site
publishes new content; it'll add only the new files and overwrite the
manifest + page JSON with the latest.

## Limitations

- Squarespace sometimes serves the hero video via Cloudflare Stream as
  a signed HLS playlist that expires. If `raw/video_*.m3u8` shows up
  instead of a real `.mp4`, do:
  ```bash
  ffmpeg -i "<full-playlist-url>" -c copy public/assets/video/hero.mp4
  ```
- Headless Chromium serves a non-mobile User-Agent for desktop scrape;
  some Squarespace blocks render different content on mobile. The
  mobile screenshots are taken with iPhone 14 Pro emulation but other
  per-page data uses desktop.
- This is buckmountaincannabis.com only. For cbd.restaurant (the
  BigCommerce store), the assets are easier — every product URL is in
  the CSV at `~/Downloads/products-2026-05-18.csv`. Use:
  ```bash
  awk -F, 'NR>1 {print $N}' ~/Downloads/products-2026-05-18.csv \
    | xargs -I{} curl -O {}
  ```
  (substitute `$N` for the actual image-URL column index).

# Chrome MCP Asset Rip Playbook — buckmountaincannabis.com

**Why this exists:** buckmountaincannabis.com is JS-rendered (likely
Squarespace / Webflow). `WebFetch` only returns `/images/hero.jpg`. We
need a real browser session to walk the DOM, capture the looping hero
video, save the per-section backdrops, and capture any special effects
(scroll parallax, intersection-triggered animations, audio cues).

This needs to run from your home machine (openclaw or the dev box)
where Chrome MCP is logged in. From the Vercel sandbox I can write the
code + the playbook, but not drive a browser.

## Side-by-side QA

Open two Chrome windows on openclaw or your dev box:

- **Window A:** https://buckmountaincannabis.com (the legacy original)
- **Window B:** https://buckmountain-farm.vercel.app (our rebuild,
  auth-walled — log in as a Vercel team member)

Scroll both at the same time. Look for:

- Hero video — playing? muted? autoplays?
- Section transitions — parallax speed, crossfade timing, overlay opacity
- Type — font family, weights, tracking
- Colors — overlay tint, accent gold (#c9b582 in our build)
- Any audio (the legacy site sometimes ships a hidden audio cue)
- Mobile Safari behavior (open the inspector device toolbar)

File a side-by-side screenshot pair for any discrepancy into the
`handoff/qa-pairs/` folder.

## Phase 1 — Capture the hero video

```javascript
// In Chrome MCP, navigate to https://buckmountaincannabis.com
// Then in the DevTools console:
const videos = Array.from(document.querySelectorAll('video, source'));
const sources = videos
  .map((v) => v.currentSrc || v.src)
  .filter(Boolean)
  .filter((s) => s.startsWith('http'));
console.log(JSON.stringify(sources, null, 2));
```

Save each URL with `curl -O` to `~/openclaw-media-ingestor/buckmountain/`.

The openclaw watcher will:
1. Detect the new video file
2. Classify it (`kind=video`, tag includes the basename hints)
3. POST to `/api/admin/assets` with the SHA-256

From there, we hand-pick which one becomes
`/public/assets/video/hero.mp4`.

## Phase 2 — Capture the section backdrops

```javascript
// Walk all images on the page that are larger than 800px wide
const imgs = Array.from(document.querySelectorAll('img'));
const big = imgs
  .filter((i) => i.naturalWidth >= 800 || i.width >= 800)
  .map((i) => ({
    src: i.currentSrc || i.src,
    alt: i.alt,
    width: i.naturalWidth,
    height: i.naturalHeight,
    parent: i.closest('section, [class*="section"]')?.id || null,
  }));
console.log(JSON.stringify(big, null, 2));
```

Save into `~/openclaw-media-ingestor/buckmountain/backdrops/` so the
watcher tags them with `tag=strain-still` / `backdrop` and the right
bucket.

## Phase 3 — Capture the CSS rules driving the scroll effects

The legacy site uses skrollr or a Squarespace scroll plugin. To
replicate exact timing, grab the rules:

```javascript
const styleEls = Array.from(document.querySelectorAll('style'));
const allRules = styleEls
  .flatMap((s) => Array.from(s.sheet?.cssRules ?? []))
  .map((r) => r.cssText)
  .filter((r) => /parallax|scroll|backdrop|background-attachment|will-change|transform: translate/i.test(r));
console.log(allRules.join('\n'));
```

Drop the output into `handoff/legacy-css-snippets.css` for the rebuild
to mirror.

## Phase 4 — Audio + intersection effects

```javascript
// Audio elements (legacy may have a hidden one)
console.log(Array.from(document.querySelectorAll('audio')).map((a) => a.src));

// Any IntersectionObserver use is visible via the page's JS bundles —
// pop the network tab, sort by JS, look at the bundle source for
// 'IntersectionObserver' or 'requestAnimationFrame'.
```

## Phase 5 — Sitemap (for migration)

```javascript
fetch('/sitemap.xml').then(r => r.text()).then(console.log);
```

Save the sitemap to `handoff/legacy-sitemap.xml`. The rebuild should
preserve every URL via 301 redirects (set in `next.config.ts` →
`async redirects()`). Especially the per-strain product pages —
they have SEO equity we don't want to lose.

## After the rip — copy assets into the repo

```bash
# On openclaw (or your dev box)
cd ~/openclaw-media-ingestor/buckmountain/
# Hero video — the cleanest, shortest loop wins
cp hero-final.mp4 ~/buckmountain_farm/public/assets/video/hero.mp4
ffmpeg -i hero-final.mp4 -ss 1 -frames:v 1 ~/buckmountain_farm/public/assets/video/hero-poster.jpg

# Backdrops 01-05
cp backdrop-hybrid.jpg ~/buckmountain_farm/public/assets/backdrops/01-hybrid.jpg
cp backdrop-hoop.jpg   ~/buckmountain_farm/public/assets/backdrops/02-hoop.jpg
cp backdrop-cult.jpg   ~/buckmountain_farm/public/assets/backdrops/03-cultivation.jpg
cp backdrop-jars.jpg   ~/buckmountain_farm/public/assets/backdrops/04-jars.jpg
cp backdrop-skate.jpg  ~/buckmountain_farm/public/assets/backdrops/05-skate.jpg
```

Commit + push — Vercel rebuilds + the new assets land at next page
load.

## Caveats

- The legacy site may serve a different hero video to mobile vs
  desktop. Capture both, decide which one we ship.
- Some Squarespace videos use Cloudflare Stream — the URL is a
  signed HLS playlist that expires. If `curl -O` returns a tiny .m3u8,
  download via `ffmpeg -i playlist.m3u8 -c copy hero.mp4`.
- Don't rip without permission from cultivator-side. Buck Mountain
  *owns* this content, but the cultivator may have a stronger original
  master copy on their drive — ask before assuming the web-served
  version is the best.

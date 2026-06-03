# Cinematic strain previews — "the jar in your hand"

> **Status:** PLAN / not started. This doc is the coordination surface between
> two Claude Code sessions that cannot talk directly:
> - **openclaw orchestrator** (other machine) → drives **chl0e** for ingest,
>   OCR labeling, transcode, and compositing.
> - **website** (`og-gitclaw/buckmountain_farm`) → consumes the rendered
>   assets via the existing `POST /api/admin/assets` rail and renders them on
>   `/strains` + `/strains/[slug]`.
>
> Paste **§A** into the openclaw session as chl0e's job spec. Paste **§B** into
> a fresh website session when assets start landing. Do the **feasibility gate
> (§0) first** — it's two evenings of work and it's where this either proves
> out or doesn't.

---

## The experience we're building

A patient who can't travel to the dispensary opens a strain page. The camera
appears to **move toward a glass jar**, the jar **rotates**, and as it gets
close the **flower video starts playing inside the jar**, then the camera
**zooms onto the bud itself**. It emulates picking up a jar at the counter and
examining the flower. Tile = lightweight loop; strain page = full cinematic.

Three rendered derivatives per strain, all baked server-side so every device
just plays an MP4 (no WebGL dependency for v1):

| Derivative | Where | Budget | Source |
| :-- | :-- | :-- | :-- |
| `poster_url` | tile + page, first paint, reduced-motion fallback | still JPG/WebP | frame grab |
| `tile_loop_url` | `/strains` tile, autoplay muted loop | ≤ 5 s, ≤ ~2 MB | jar approach only |
| `cinematic_url` | `/strains/[slug]` hero | 12–18 s | approach → jar → flower → macro |

---

## §0 — FEASIBILITY GATE (do this before anything scales)

The whole pipeline hinges on **automatically labeling each existing flower
video with the right strain** from the **black sharpie writing on the bottom of
the bag**, which is always at the **very end** of the clip. If that OCR step
isn't reliable, everything downstream inherits the error.

1. **Sample.** Pick **3–5** existing flower videos covering your handwriting
   range (clear, messy, abbreviation-only). Drop them in the Tailscale share;
   note the path here once done:
   - Tailscale path: `__________________________`
2. **chl0e runs the OCR probe** (§A step 2) on just those 3–5.
3. **Score it.** If ≥ 90% land the correct `strain_slug` with high confidence →
   green-light the full run. If not → fix labeling *first*: brighter sharpie,
   a printed strain card held at the end of the shot, or a chl0e
   "confirm/correct" prompt per clip. **Do not scale a mislabeling pipeline.**
4. **One full cinematic, one strain.** Before batching, take ONE strain all the
   way through §A steps 3–5 and look at it on a preview deploy. If the effect
   doesn't land at n=1, no amount of throughput matters.

---

## §A — openclaw / chl0e job spec  (paste into the openclaw session)

```
You are chl0e, running on the openclaw machine. New standing job: build the
cinematic strain-preview asset pipeline for buckmountain.farm. Work in stages;
STOP at the end of stage 0 and report before scaling.

Context you can rely on:
- The website already exposes POST {BUCKMOUNTAIN_BASE}/api/admin/assets,
  Bearer {ADMIN_ASSET_INGEST_TOKEN}, schema "buckmountain-farm/asset/v1",
  idempotent upsert by sha256. This is the ONLY way assets reach the site.
- Strain slugs are the join key. Canonical list lives in the website repo at
  data/strains.ts (field: slug). Get the current list from whoever owns that
  repo session, or from {BUCKMOUNTAIN_BASE}/strains.

STAGE 0 — feasibility (do ONLY this, then report):
  1. Ingest the 3–5 sample videos from the Tailscale share path the user
     provides. Compute sha256, copy to a working dir, never mutate originals.
  2. OCR PROBE — strain labeling from the bag:
     - The strain name / abbreviation is hand-written in black sharpie on the
       bottom of the bag and appears in the LAST ~2 seconds of every clip.
     - Extract the final 2s, sample ~10 frames, run OCR (Tesseract is fine;
       try a contrast/threshold pass + a crop to the lower third where the
       writing sits). Take the highest-confidence token.
     - Fuzzy-match that token against the canonical strain slug list
       (Levenshtein + known abbreviations). Emit per clip:
         { file, sha256, ocr_text, ocr_confidence, matched_slug, match_score }
     - Report a table. Compute the % that matched correctly (user confirms).
  3. STOP. Do not transcode or composite yet. Wait for the green light.

STAGE 1 — batch ingest + label (after green light):
  - Run stage-0 OCR over all 30–40 flower videos.
  - Anything below the confidence threshold → quarantine for manual
    confirm/correct (interactive prompt or a review file), never silent-guess.
  - Output a manifest: { strain_slug -> [source video sha256s] }.

STAGE 2 — derivatives per strain:
  - poster:    representative frame, deflickered, color-balanced -> JPG/WebP.
  - tile_loop: <=5s, <=~2MB, H.264 + a VP9/AV1 sibling, muted, seamless loop,
               this is the "camera approaching the jar" beat only.
  - cinematic: 12-18s composite (see STAGE 3).
  - Name derivatives deterministically: {slug}__{poster|loop|cine}.{ext}.

STAGE 3 — the composite (this is the craft step):
  The jar turntable footage is shot by the user (see website doc §C). For each
  strain combine:
    a. APPROACH  - chroma-key the lazy-susan + background out of the 360 jar
       turntable; animate scale-up + slow rotate so the camera reads as moving
       toward the jar.
    b. REVEAL    - mask the jar opening; when the camera is "over" the jar,
       blend the macro flower video so it plays INSIDE the glass.
    c. ZOOM      - push in past the glass onto the bud; hand off to the flower
       macro for the final beat.
  Build ONE reusable template (AE/ffmpeg/Nuke - your call) parameterized by
  {jar_clip, flower_clip, strain_slug} so strain N+1 is a re-render, not a
  re-edit.

STAGE 4 — publish:
  For each derivative POST a record to /api/admin/assets with:
    tags: ["strain-preview", "strain:{slug}", "role:{poster|loop|cine}"]
  so the website can query assets by tag and wire URLs into data/strains.ts.
  Report the {slug -> {poster_url, tile_loop_url, cinematic_url}} map back to
  the website session.

Hard rules: never touch originals; idempotent by sha256; quarantine low-
confidence labels; STOP after stage 0 for sign-off.
```

---

## §B — website session brief  (paste when assets start landing)

```
Repo og-gitclaw/buckmountain_farm; develop on branch claude/strain-cinematic;
draft PR. Wire chl0e's rendered strain previews into the site.

Inputs: chl0e publishes three derivatives per strain to /api/admin/assets,
tagged ["strain-preview","strain:{slug}","role:{poster|loop|cine}"], and hands
back a { slug -> {poster_url, tile_loop_url, cinematic_url} } map.

Do:
1. data/strains.ts — add optional fields to the Strain type:
     poster_url?: string | null
     tile_loop_url?: string | null
     cinematic_url?: string | null
   Populate for strains chl0e has rendered; leave null otherwise.
2. Tile (app/strains/bento-strain-grid.tsx): when tile_loop_url present, render
   a muted autoplay loop <video poster={poster_url}> that pauses off-screen
   (IntersectionObserver) and falls back to StrainPlaceholder/hero_image_url
   when absent. Respect prefers-reduced-motion -> show poster only.
3. Strain page (app/strains/[slug]/page.tsx): when cinematic_url present, show
   the cinematic above the fold (poster as first paint, lazy-load the MP4).
   Keep the page SSG — video element is a small client child, page stays
   statically generated (same pattern as the merged NotifyMe control).
4. Bandwidth: preload="none" on tile loops, only the in-view tile loads; one
   cinematic per page; provide the VP9/AV1 sibling via <source> ordering.

Acceptance:
- /strains tiles autoplay the loop in view, poster otherwise, reduced-motion
  shows poster only, no layout shift.
- /strains/[slug] plays the cinematic, still prerenders SSG (check build output).
- Strains without assets render exactly as today (no regressions).
- next build green.
```

---

## §C — how YOU record the jar turntable (the IRL step)

One strain at a time. Consistency between strains is what makes the template
reusable, so lock everything:

1. **Rig.** Flower in a **clear glass jar** on a **lazy susan**. Solid sweep
   behind (white or green — green keys cleaner; white is more forgiving of
   spill). Tripod locked, camera level with the jar's middle.
2. **Light.** Two soft sources at 45°, no moving shadows. **Lock exposure,
   focus, white balance** (manual) so frames composite without flicker.
3. **Capture.** Either a smooth **360° video** (rotate the susan ~20–30s, one
   revolution) **or** a **60-frame burst** (shutter every 6° for one turn).
   Frames are easier to deflicker; video is faster to shoot. Start with frames.
4. **The flower macro** is your *existing* end-of-bag footage (the same clips
   chl0e is labeling) — that's what plays "inside the jar." So the jar shoot
   only needs the empty-ish jar turntable; the bud detail already exists.
5. **Slate.** Hold the sharpie strain card in the LAST 2 seconds here too, so
   the turntable clip self-labels with the same OCR step.

---

## Architecture decision on record

**v1 = baked MP4 composites** (this doc). Ships in weeks, plays everywhere,
no WebGL perf cliff, iterate the look in an editor. **v2 = interactive WebGL
turntable** (user drags to rotate, gaussian-splat or frame-sequence) — only
after v1 proves the effect lands. Don't build v2 first.

## Open questions for the user
- [ ] Tailscale sample path for §0.
- [ ] Green or white sweep for the jar shoot? (green keys cleaner)
- [ ] Confirm chl0e can run headless ffmpeg/Tesseract + an AE-or-equivalent
      compositor, or whether compositing happens on your Mac.

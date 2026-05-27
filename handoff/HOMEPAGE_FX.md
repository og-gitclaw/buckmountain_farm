# Homepage FX Toolkit — buckmountain.farm

The flashy-but-not-overwhelming effect set. Each component is opt-in
per section; the homepage uses a curated mix. All effects respect
`prefers-reduced-motion`, all sit on the GPU (no main-thread scroll
handlers in steady state), all degrade cleanly in older browsers.

## What ships

| Component | What it does | Cost |
|---|---|---|
| `<VideoParallaxHero>` | Looping hero video, slow-scroll decoupled, IO-paused, blurred+darkened | One video element, one rAF loop while in view |
| `<VideoScene>` | Looping mid-page video behind text, IO-paused, edge-faded | One video element per scene, IO only |
| `<ScrollScrubbedVideo>` | **Apple-style** — video `currentTime` tied to scroll % within a tall section. Visitor "drives" the playback. | One video element, one rAF on scroll while in view. Uses `fastSeek()` on Safari |
| `<BentoStrainGrid>` | Mixed aspect-ratio tiling of strain cards, each with its own micro-loop (or procedural placeholder). IO-paused per tile. | N video elements, only the visible one decodes |
| `<AuroraMesh>` | Three drifting radial gradients, pure CSS keyframes. Brand-token colors. Sits behind content as atmospheric wash | Zero JS, zero network |
| `<GrainOverlay>` | Inline-SVG `feTurbulence` fractal noise, fixed page-wide overlay at low opacity. Animated step-shift. | ~5KB SVG, compositor-only |
| `<MagneticButton>` | Cursor pulls the button within radius; snaps back on leave. Touch + reduced-motion safe (renders normal) | One mousemove listener per button while hovered |

Plus CSS utilities (in `app/globals.css`):

- `.reveal-on-scroll` — single element fades up on scroll-into-view (CSS `animation-timeline: view()`)
- `.reveal-stagger` / `.reveal-stagger-item` — staggered fade-up for a list / cluster
- `.text-brand-gradient` — white → gold → purple-frame gradient on text
- `.link-underline` — animated underline on hover
- `.chapter-divider` — gold-hairline + uppercase-tracking chapter label
- `.snap-page` — opt-in scroll-snap container

## Effect dial — how to "more flashy" vs "more calm"

These knobs change the feel without ripping out components:

| Knob | Calmer | Flashier |
|---|---|---|
| `VideoParallaxHero` `videoBlurPx` | 2-3 | 0-1 |
| `VideoParallaxHero` `parallaxFactor` | 0.10 | 0.25 |
| `VideoScene` `overlayOpacity` | 0.75 | 0.40 |
| `ScrollScrubbedVideo` `lengthInVh` | 5 (slower scrub) | 2 (faster scrub) |
| `AuroraMesh` `intensity` | 0.25 | 0.75 |
| `GrainOverlay` `opacity` | 0.04 | 0.10 |
| `MagneticButton` `pull` | 0.20 | 0.50 |
| Drop `.reveal-stagger` from a section | Less attention-grabbing | — |

## The current homepage recipe

```
[VideoParallaxHero]         ← aerial drone, blurred, magnetic CTAs
[Chapter divider]           ← "Chapter I · Always Grinding"
[StrainUpdates]             ← live DB feed
[ScrollScrubbedVideo]       ← interior HPS, drives with scroll
[VideoScene × 2]            ← Hoop Dreams + Legacy Cultivation
[BentoStrainGrid]           ← 7-tile mixed grid of strains
[Aurora + ParallaxBackdrops + FAQ]   ← atmospheric tail
[Footer]
```

Total weight: 4 hero/scene video files (~14 MB) + bento micro-loops
(0 KB today, plug-in slots wired). Aurora + grain + reveal animations =
0 KB extra payload (pure CSS / inline SVG).

## When you get real micro-loops

`<BentoStrainGrid>` already accepts `videoForSlug` props. Drop per-strain
3-second loops at `public/assets/strains/<slug>.mp4` and wire them via:

```tsx
<BentoStrainGrid
  videoForSlug={{
    "permanent-og":     "/assets/strains/permanent-og.mp4",
    "cheetah-piss":     "/assets/strains/cheetah-piss.mp4",
    "gelato-41":        "/assets/strains/gelato-41.mp4",
    // …
  }}
/>
```

Procedural `StrainPlaceholder` cards fill in for any slug without a video,
so partial coverage works fine.

## Video encoding notes for ScrollScrubbedVideo

Scrubbing only feels smooth if the source has frequent keyframes — by
default ffmpeg encodes one every 250 frames (~8s at 30fps), which means
seeking shows the last keyframe and waits. Re-encode hero clips with:

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 22 \
  -g 15 -keyint_min 15 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  -an output.mp4
```

`-g 15` = keyframe every 0.5s at 30fps. File grows ~15-20% but scrubbing
becomes butter. Apply to all clips used with `<ScrollScrubbedVideo>`.

## Browser support

| Feature | Where |
|---|---|
| `animation-timeline: view()` | Chrome 115+, Safari 26+ (Interop 2026 target), Firefox behind flag |
| `View Transitions API` | Chrome 111+, Safari 18+ |
| `backdrop-filter` | Universal |
| `position: sticky` | Universal |
| `mix-blend-mode` | Universal |
| `feTurbulence` SVG filter | Universal |

Everything fails open: in older browsers the reveal animations are
no-op (content visible immediately), the aurora drifts via the same
keyframes (all browsers), the magnetic button degrades to a normal
button, and the scroll-scrubbed video falls back to looping play
(via `prefers-reduced-motion` path).

## Performance

- Steady state CPU: ~0% (everything compositor-only)
- Steady state GPU: ~3-5% on a 2020 MacBook Air (aurora + one playing video)
- Scroll cost: 1 rAF/frame while ScrollScrubbedVideo is in view, dormant otherwise
- Total LCP impact: ~0 (hero is unchanged from v1)
- Total CLS: 0 (no late-shifting layouts)

## When the effect dial goes too high

Watch-for symptoms on the QA pass:

1. **Choppy mobile scroll** — drop `<ScrollScrubbedVideo>` (it's the only
   scroll-coupled effect) or push its `lengthInVh` to 5
2. **Hot battery** — drop `<AuroraMesh>` (the 3 blob layers add ~1% GPU)
3. **Text hard to read** — bump `overlayOpacity` on the video components
4. **Grain visible as banding** — drop `<GrainOverlay>` opacity to 0.03
   or remove it from `app/layout.tsx`

All four reversions are one-line changes.

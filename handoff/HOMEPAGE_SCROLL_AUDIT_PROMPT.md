# Homepage scroll audit — for codex / openclaw orchestrator session

> **Status:** open question. Two boundary classes are already fixed in
> PR #21 (StrainUpdates ↔ ScrollScrubbedVideo, VideoScene ↔ VideoScene,
> VideoScene ↔ BentoStrainGrid). User flagged the original bleed as fixed
> but suspects more issues remain. This doc is the brief for a second-pair-
> of-eyes audit run in a fresh codex session.

## Why you (codex), not me (claude)
The session running on this repo opened PR #21 and is too close to the
specific fix it just shipped. A fresh planning-style session can scan the
entire scroll path with no priors and call out things the first pass
missed. Run this audit **without writing code first** — just produce a
written report. The repo session will execute the fixes once you've
agreed on what's actually broken.

## What's already fixed (don't re-flag)
- `StrainUpdates` bottom scrim now black-terminates at the very bottom
  edge (linear gradient stacked on the radial scrim).
- `ScrollScrubbedVideo` top+bottom scrim now 0.95 → 0.55 → 0 over the
  first ~22% on each side instead of 0.5 → 0 → 0 → 0.5.
- `VideoScene` (both instances on the homepage) gets the same 0.95 → 0
  black hand-off as `ScrollScrubbedVideo`.
- `BentoStrainGrid` now de-dups against `StrainUpdates` (the same three
  slugs no longer appear twice on the homepage scroll).
- `min-h-screen` → `min-h-[100svh]` on StrainUpdates + FAQ tail; the
  ScrollScrubbedVideo sticky pin sized in `svh` so iOS URL-bar collapse
  doesn't shift mid-playback.
- `ScrollScrubbedVideo` `lengthInVh` 3.5 → 2.5 at the homepage callsite.

## What to audit

Scroll the homepage top-to-bottom on a desktop browser AND in mobile
emulation (Chrome DevTools / Safari Responsive Design Mode). Report on:

### 1. Smoothness — anywhere the scroll feel jolts, jumps, or stutters
Likely suspects:
- `components/parallax-backdrops.tsx` `startOffset={1}` in
  `app/page.tsx` line ~152. The FAQ section the global parallax sits
  behind is ~7-8 viewport-heights down the page. With `startOffset=1`,
  the parallax begins fading in at 0.5vh of scroll and its three
  backdrops cycle through within the first ~3.5vh of page scroll —
  long before the FAQ section is in view. By the time the user
  reaches the FAQ, all three backdrop opacities are clamped to 0
  (`opacity = max(0, 1 - distance)` with distance ≥ 8). Is this a
  *visible* bug or just wasted decode work? Either way, what
  `startOffset` value would make the parallax actually visible behind
  the FAQ section it was placed under?
- `VideoParallaxHero` uses a scroll-coupled `translate3d`. Does the
  hero video stutter on touchpad scroll, especially over the first
  100vh? rAF-throttled but the math is `scrollY * parallaxFactor`
  with no smoothing.
- `ScrollScrubbedVideo` uses `video.fastSeek(t)` falling back to
  `currentTime`. On macOS Safari this can show keyframe-only black
  frames if the source isn't encoded with frequent keyframes (`-g
  15` for 30fps source per the component's own header comment). Are
  the hero MP4s actually encoded that way? Check
  `public/assets/video/*.mp4` keyframe interval with `ffprobe`.
- `reveal-on-scroll` and `reveal-stagger` classes — what do they
  actually do in `app/globals.css`? If they use
  `animation-timeline: view()` (scroll-driven animations), behavior
  differs on Safari < 17 and Firefox until very recent. Does the
  fallback look right, or do items just pop in jankily?
- `BentoStrainGrid` `BentoTile` does its own IO loop, no
  `prefers-reduced-motion` gate. Is it spinning up videos on a
  reduce-motion user?

### 2. Glitchiness — any visual artifact, flicker, or layout shift
- The `StrainUpdatesBackdrop` parallax layer is `-top-[15%] h-[130%]`
  inside an `absolute inset-0 -z-10 overflow-hidden` wrapper. If the
  travel math (`rect.height * 0.22` — already < 15% overscan) is
  ever exceeded by browser-specific rounding, an edge could pop.
  Verify by scrolling fast.
- Anywhere `position: fixed` interacts with a `transform`-applied
  ancestor (which would make `fixed` contain to that ancestor instead
  of the viewport). The site-nav, age-gate, and Bento all set
  transforms — do any wrap a fixed element?
- `app/page.tsx` has `<AuroraMesh intensity={0.55} />` and
  `<ParallaxBackdrops .../>` siblings in the same `relative isolate`
  section. Stacking order, opacity transitions — anything reading as
  a flicker?

### 3. Duplicate scenes during scroll
The user explicitly said: "DUPLICATES which is a different problem
altogether."
- `BentoStrainGrid` was de-duplicated against `StrainUpdates`. Is
  there ANY OTHER content shown twice on the homepage?
  - Hero copy mentions "hoop dreams" — does the strain rotation card
    for that section feel like a re-mention?
  - `VideoScene` heading "Outdoor Hoop Dreams" — any visible duplicate
    elsewhere on the homepage? (Backdrop `caption` "Outdoor Hoop
    Dreams" in `ParallaxBackdrops` is aria-hidden and not rendered,
    so doesn't count.)
- Are any two of the hero MP4s (`hero-a-establish`, `hero-b-interior`,
  `hero-c-flower`, `hero-d-foothills`) visually similar enough that
  they read as the same shot? If yes, which one would you drop or
  re-edit and why?
- Are any `/assets/backdrops/*.jpg` files visually similar enough that
  the global parallax cross-fade looks like one image translating
  rather than three rotating?

### 4. Mobile-specific
- iOS Safari URL bar collapse: PR #21 switched several heights to
  `svh`. Is there ANYTHING ELSE still using `vh` for full-height
  layout that would jump on bar collapse? (`grep -rn "100vh\|min-h-screen\|h-screen" app components`).
- `ScrollScrubbedVideo` on mobile — even at `lengthInVh=2.5` it's
  ~2.5 phone-screens of scroll. Test the *feel*: is that too long
  for the b-roll it's playing? What's a better number?
- The horizontal scroll-snap row in `StrainUpdates` (`md:grid`
  desktop, flex row on mobile) — does the snap actually feel right
  on touch? Does the rightmost card peek hint correctly?

## Output expected
Report back as a single comment on PR #21 (or a follow-up draft PR if
you want to propose fixes), in this shape:

```
SMOOTHNESS:
- <finding 1, file:line, fix sketch>
- ...

GLITCH:
- ...

DUPLICATES:
- ...

MOBILE:
- ...

NOT REAL — flagged but ok:
- ...
```

## Hard rules
- Audit only first. Don't open a fix PR until the user signs off on
  what's actually broken.
- Reuse existing components rather than introducing new ones unless
  the user asks.
- If a "fix" would require ripping out an existing design choice
  (e.g. removing one of the four hero videos), flag it as
  architecturally significant and ask before queueing.

# Buck Mountain — Desktop → Mobile FX plan

Cross-portfolio audit + the order we implement effects so the mobile
view feels as polished as desktop. Pulls signal from:

- **bigmoosehemp.com** (Wix) — sister hemp brand. Wix Motion runtime,
  pill CTAs, sticky-bg hero, almost zero tile motion. Mostly a "what
  not to do" inheritance — improve on what BMH skipped.
- **jackiej.events** (Next.js) — Brendon's DJ site. Framer Motion +
  GSAP/ScrollTrigger + Lenis smooth-scroll + heavy glamour effects.
  Take the *patterns*, drop the disco/diamonds, retone to Sierra-amber.

## Effect inventory across the portfolio

| Effect | LGP | BMH | Jackie | Buck (today) | Buck (planned) |
|---|---|---|---|---|---|
| Magnetic CTA | yes | no | yes (Framer spring) | yes (custom) | **upgrade**: add `data-arrow` translate + Sierra-amber gradient pill |
| Pill primary CTA | no | yes (flat green) | yes (pink, orbited) | **new — `.cta-pill`** | keep, scale to header CTA + footer CTA |
| Scroll-scrubbed video | no | no | only on /sound | yes (`ScrollScrubbedVideo`) | keep, add a second one in `/strains/[slug]` |
| 3D tile entrance | no | no | partial (Reveal y+blur) | **new — `.tile-fall`** | extend to Drops grid, Strain Updates cards |
| Card tilt | no | no | yes (Framer Motion 3D) | **new — `.card-tilt`** | extend to dispensary cards (/agent) and admin cards |
| Lenis smooth-scroll | no | no | yes | no | **Phase 2**: import `lenis` (5KB), wrap in `<SmoothScrollProvider>` |
| Blur-rise reveal | no | no | yes (Reveal w/ blur 8px → 0) | **new — `.reveal-blur-up`** | swap `.reveal-on-scroll` callsites over to it where text is the focus |
| Marquee strip | no | no | yes (30s linear, mask-faded) | no | **Phase 2**: dispensary placement strip (Weedmaps/Leafly) |
| Aurora mesh bg | no | no | partial | yes (`AuroraMesh`) | keep, retoned palette for sister-property variants |
| Grain overlay | no | no | yes (0.06 fractalNoise, screen) | yes (`GrainOverlay`) | already universal |
| Sticky-bg hero | partial | yes (only thing they did right) | no | hero uses ParallaxHero | **Phase 2**: try Wix-style sticky bg for /about |
| 360°-morph tile | partial (LGP skill `3d-morph-action-buttons`) | no (Pro Gallery zoom only) | no | no | **Phase 3**: morph thumbnail → micro-video on hover, global "only one active" guard |

## Today's commit (claude/mobile-polish)

Already shipped on the preview branch:

- Real Buck Mountain deer-head mark as **favicon.ico** (auto-discovered
  by Next App Router) + 16/32/180/192/512 PNG icon set in
  `/public/icons/` + `manifest.webmanifest` so PWA install works.
- **SSR/CSR hydration fixed** on `ParallaxBackdrops` +
  `VideoParallaxHero`. Both used to read `window.scrollY` /
  `window.innerHeight` during render, which produced different
  trees on the server vs first client paint. Now gated behind a
  `mounted` flag.
- **Logo size + flex shrink** on the site nav. Mobile: `h-14 w-14`
  with `shrink-0` so Next/Image doesn't collapse to `0px`. Desktop:
  `h-28 w-28`. Logo + 5 text nav links + search now fit on a 375px
  viewport with no overflow.
- **Hero CTAs upgraded** to Sierra-amber gradient pill (`.cta-pill`) +
  glass ghost (`.cta-pill-ghost`) — improves on BMH's flat green
  pill (no lift, no shadow, no transform) and Jackie's pink magenta
  by retoning to brand. Arrow nudge on hover via `data-arrow` span.
- **3D tile-fall** entrance on the Bento strain grid. Tiles arrive
  from above the grid plane at `rotateX(-28deg)`, drift in via
  `animation-timeline: view()` with a `--tile-i`-driven stagger
  (65ms per tile). Falls back to instant-visible in older browsers.
- **Card-tilt** hover on the same bento tiles — ±2.5° rotation +
  4px lift. Pure CSS (`.card-tilt`), no JS.
- **Bento grid row height** explicit on mobile (180px) — was
  collapsing to 0 because every child was `absolute`-positioned.
- **`.reveal-blur-up`** utility class added for richer entrance
  motion than the existing `.reveal-on-scroll`. Not wired into any
  callsite yet — Phase 2.

## Mobile parity rules (going forward)

Whenever a desktop effect is added, write the mobile fallback in the
same change. Three rules:

1. **No `pointer: fine`-gated effect without a mobile equivalent.**
   The magnetic CTA's mouse-pull disables itself on touch via
   `matchMedia("(hover: hover) and (pointer: fine)")` — that's fine,
   *if* the static state still looks intentional (gradient, shadow,
   arrow). It does. Don't ship a CTA whose only feel-good signal is
   the magnet.
2. **Tile entrances stagger by index, not by ms-delay alone.**
   `--tile-i` lets the same keyframe scale from 4-up desktop to 2-up
   mobile without re-tuning. Use this pattern for every grid.
3. **`prefers-reduced-motion`** is non-negotiable. Every new
   keyframe ends with a `@media (prefers-reduced-motion: reduce)`
   override. Already enforced for `.tile-fall`, `.reveal-blur-up`,
   `.card-tilt`, `.cta-pill`.

## Placement / timing notes

- **Hero h1**: stays at 5xl/7xl. The brand-gradient text reads better
  on mobile than gold solid (more contrast against the foothills
  drone footage). Keep.
- **Strain Updates** cards: currently horizontal scroll-snap on
  mobile (good — already there). Phase 2: add `.reveal-blur-up` to
  each card with `--tile-i: nth-of-type` so they cascade in instead
  of arriving together.
- **Bento grid**: today's `.tile-fall` does the heavy lifting.
  Featured anchor tile spans 2x2 on desktop but 1x1 on mobile. The
  3D fall reads on both because perspective + rotate are
  resolution-independent.
- **VideoScenes**: `align="center"` plays better on mobile than
  `align="left"` for short copy. Currently mixed — Phase 2 audit.
- **Footer**: flex-wrap stack on mobile (already works). Phase 2:
  separate compliance row (Privacy/Terms/COA) onto its own line so
  the brand line + IG handle don't compete with legal text.

## Phase 2 (next branch)

In priority order:

1. **Lenis smooth-scroll** wrapper at the root layout. 5KB, biggest
   single "this feels expensive" upgrade. Disabled under
   reduced-motion.
2. **`.reveal-blur-up`** on Strain Updates cards + chapter dividers
   + FAQ items.
3. **Wholesale page** picture-tilt (use `.card-tilt`).
4. **`/before-after`** page: switch the existing scroll-driven
   beats to use `animation-timeline: view()` instead of the JS
   IntersectionObserver they likely use (audit needed).
5. **Marquee** of dispensary names where stock-keeping data lives.

## Phase 3 (post-Randy)

- 360° spinner / scroll-loop video on strain detail pages
  (`/strains/[slug]`) — use the existing
  `3d-morph-action-buttons` skill pattern. One-at-a-time guard
  across the grid; pre-rendered painted thumbnail until hover/tap.
- View Transitions API navigation between strain pages (the slug
  changes but lineage tree + effect bars cross-fade).
- Audio loop on the cultivation b-roll (footstep + wind + buds
  crinkling) — opt-in via a sound-toggle in the nav. Plays once,
  user has to re-enable per session.

## Do NOT lift from sister sites

- Jackie's orbital diamonds, magenta pulse-glow, text-shimmer,
  disco conic overlay, sparkle field. Pure Vegas, undercuts
  legacy-cannabis authority.
- BMH's instant-no-transition button hover. Looks broken.
- Wix's giant unscaled mobile (3383px viewport at 412px window).
  Fluid-scale-the-whole-page is the wrong primitive.

## Verification checklist (each release)

- [ ] `prefers-reduced-motion: reduce` browser flag → no animation
  fires.
- [ ] `pointer: coarse` (touch) → magnetic CTA is static, card-tilt
  doesn't fire.
- [ ] iOS Safari 16 → `animation-timeline: view()` quietly degrades
  to instant-visible (don't show the pre-animation state).
- [ ] Lighthouse mobile ≥ 90 across the four core metrics.
- [ ] No hydration warnings in the dev console (this commit closed
  the parallax/video-hero pair; future client components should
  follow the `mounted` gate pattern).

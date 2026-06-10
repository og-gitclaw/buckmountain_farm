# Homepage noise audit — issue history + codex audit prompt

> **Status:** OPEN. This doc records what's been tried on the buckmountain.farm
> homepage over the last ~2 weeks of iteration, the issues that kept coming
> back, and a paste-ready brief for the **openclaw orchestrator's codex
> session** to do a fresh-eyes layout reevaluation.
>
> Paste **§B** into the codex session as a planning-only audit. Codex
> proposes; we approve; then the orchestrator either pushes a follow-up PR
> or hands off to the website session.

---

## §A — What the user has been experiencing (Brendon's words, paraphrased)

A timeline of complaints + what we shipped to address each:

| Date | Symptom | Fix attempted (PR) | Stuck? |
| :-- | :-- | :-- | :-- |
| early | Strain Updates flower-bud parallax bled into the ScrollScrubbedVideo's FAVEN grow-light poster below it; same three strains appeared in StrainUpdates **and** BentoStrainGrid (Permanent OG / Gelato 41 / Cheetah Piss) | PR #21 — black-fade hand-offs at section boundaries; bento de-dups against the updates feed; `min-h-svh` for iOS dynamic viewport | helped, didn't fully solve |
| same | "Hero video doesn't autoplay on the homepage" | PR #23 — `preload="metadata"` on the hero, `preload="none"` + lazy on every below-fold video; SSV defers `src` until ~1vh from viewport | resolved that specific complaint |
| same day | "Too many autoplay/scroll-related videos packed together; space them out" | PR #24 — added `<ParallaxImageBreather>` between adjacent video sections | helped, didn't fully solve |
| same day | "Still feels cluttered — move some videos off the homepage" | PR #25 — Inside-the-Room → /about, Hoop Dreams → /wholesale, homepage drops to 2 videos total | helped, didn't fully solve |
| same day | "Phantom multimedia — background videos playing under pictures" | PR #26 — diagnostic mode: every below-hero background gated behind `?fx=` URL flags, corner pill toggles each | active investigation |
| same day | Flicker around "CHAPTER I · ALWAYS GRINDING" hairlines | PR #26 commit — slowed `grain-overlay` animation from 0.8s `steps(4)` to 24s linear; bumped chapter divider hairline 1px → 1.5px and gradient peak 0.4 → 0.95 alpha so `mix-blend-mode: overlay` can't visibly modulate it | resolved |
| same day | "Use the looping hero background to create a fadeaway effect; enable smooth scroll" | PR #26 commit — `VideoParallaxHero` now scroll-links opacity (1 → 0 over 0.85vh) and parallax mutates a ref directly (no React state on scroll); `scroll-behavior: smooth` on `html` | resolved that specific complaint |
| now | "First section graduated; queue the rest one at a time" | PR #26 commit — `DEFAULT_ON: ["strain-bg"]`; plain URL = hero + strain bg | in progress |

**Where we are right now (live on PR #26 preview):**

- Hero drone video plays, scroll-fades to 0 by the time the chapter
  divider is centered.
- Chapter I divider: no flicker.
- Strain Updates section: flower-bud parallax behind glass-morphism
  cards.
- After that: nothing. FAQ text, footer.
- Every video / parallax layer below the strain bg is gated behind a URL
  flag (`?fx=interior` etc.) and toggleable from a corner pill.

**The recurring theme that we haven't really solved:** every time the
user looks at the homepage with the full set of sections enabled, they
say it feels *noisy*. We keep fixing specific bleed / flicker / load
issues but the broader question — "is this homepage's structure actually
right for the brand?" — hasn't been examined by a fresh set of eyes.

## §B — Paste-ready audit brief for the codex session

```
You are codex in the openclaw orchestrator session. Brendon has been
iterating on the buckmountain.farm homepage for ~2 weeks and the
recurring feedback — across many specific fixes — is that it feels
NOISY. The other Claude Code session running on the web container has
been doing surgical fixes (flicker, bleed, content dupes, autoplay,
fadeaway). None of those have made the page feel calm.

You're being asked for a fresh-eyes reevaluation. Planning only — do not
write code in this pass. Output a proposal Brendon can react to.

CONTEXT YOU NEED

The repo is og-gitclaw/buckmountain_farm. The current homepage lives at
app/page.tsx; the full motion vocabulary is across components/. As of
2026-06-09 the homepage on PR #26's preview is in a diagnostic gated
state — every background layer below the hero is behind a `?fx=` URL
flag and can be turned on/off via a corner pill. The plain URL currently
renders:

  1. <VideoParallaxHero>            (hero-a-establish.mp4 drone)
       - now scroll-fades opacity 1 -> 0 over 0.85 viewport-heights
       - parallax via ref mutation, no React re-renders per scroll frame
  2. Chapter divider                "Chapter I · Always Grinding"
       - gold-gradient hairlines, flicker now fixed
  3. <StrainUpdates> (with backdrop) flower-bud parallax behind cards
       - 3 cards: drop / batch / coming-soon, glass-morphism
  4. <section> FAQ                  4 questions
  5. <footer>

When Brendon graduates more sections by adding them to DEFAULT_ON in
lib/homepage-fx.ts, they appear on the plain URL. Sections still in the
gated queue (NOT on the plain URL yet) are:

  interior     <ScrollScrubbedVideo> "Inside the room." (hero-b-interior)
               - Apple-style scroll-tied playback, 350vh runway
  hoop         <VideoScene> "Outdoor Hoop Dreams" (hero-c-flower)
               - autoplay video w/ headline overlay
  foothills    <VideoScene> "A Legacy Cultivation Story" (hero-d)
               - autoplay video w/ left-aligned headline
  bento        <BentoStrainGrid> "What's Flowering"
               - 7-tile bento layout of strain cards, IO-paused video tiles
  aurora       <AuroraMesh>           animated CSS gradient mesh behind FAQ
  parallax-bg  <ParallaxBackdrops>    fixed-position scroll parallax stack
               - 02-hoop / 03-cultivation / 05-skate cross-fade

Global layers applied site-wide (app/layout.tsx):

  <GrainOverlay opacity={0.06} blendMode="overlay">
       - fixed inset-0 z-[1], fractal-noise SVG, now drifts linearly
         over 24s (was the source of the chapter-divider flicker)

Other live atmosphere:
  - CSS reveal-on-scroll / reveal-stagger via animation-timeline: view()
  - .text-brand-gradient on the hero h1 (white -> gold -> purple)
  - Brand palette: amber/gold (#c9a24a), purple frame (#5b3a8a), deep
    neutral background

WHAT TO PRODUCE

A proposal doc, sectioned like this. Keep each section tight.

  1. WHERE YOU LANDED ON THE PREVIEW
     Open both URLs:
       https://buckmountain-farm-git-claude-fx-flags-mustwemuse-2641s-projects.vercel.app/
       https://buckmountain-farm-git-claude-fx-flags-mustwemuse-2641s-projects.vercel.app/?fx=all
     Scroll each top-to-bottom desktop AND mobile (Chrome DevTools is
     fine). One sentence each: what does the BARE state feel like, what
     does the ALL state feel like. Where does ALL stop reading as
     intentional and start reading as noisy?

  2. THE BRAND BAR
     Buck Mountain Cannabis is a legacy cannabis brand in Nevada County,
     California. Sierra foothills. Hybrid environments — light deps,
     hoop houses, indoor light-assist. "Always grinding for the highest
     quality." Patient/connoisseur audience for the main brand;
     wholesale buyers are a parallel audience. NOT a tech demo, NOT a
     consumer app. The target feel is "premium legacy farm" not "Apple
     product page" — the current motion vocabulary may be over-indexed
     on Apple-style scroll-scrub / parallax cinematics. Score the
     current direction 1-10 against that bar and explain. If you think
     the brand bar itself is mis-set, say so.

  3. CONTENT FOCUS
     The homepage today wants to do five things at once: hero, strain
     updates feed, atmospheric video (or three), bento browse, FAQ.
     Pick ONE primary job for the front page. Everything else should be
     supporting, or moved off the front. (Already moved: Inside the
     Room -> /about, Hoop Dreams -> /wholesale, in PR #25.) Propose the
     primary job + the supporting elements + what gets cut or moved.

  4. MOTION BUDGET
     Count every animation source currently competing for attention:
     hero scroll-fade, hero parallax, GrainOverlay drift, reveal-on-
     scroll fades, StrainUpdatesBackdrop parallax, scroll-scrub video,
     two autoplay videos, bento tile IO loops, AuroraMesh keyframes,
     ParallaxBackdrops cross-fade, magnetic-button hover, card hover
     lifts, scroll-snap on mobile carousel. That's roughly 13. Propose a
     hard cap (e.g. "no more than 3 simultaneous motion sources visible
     at once") and which sources to retire entirely.

  5. STACKING + LAYERING
     The current page has multiple `position: fixed` + `mix-blend-mode`
     + `animation-timeline: view()` layers stacked. That's the source of
     "phantom multimedia." Audit the stacking-context tree and propose
     a simpler layering rule (e.g. "no fixed layers below the hero
     except the grain overlay" or "no mix-blend-mode anywhere").

  6. RECOMMENDED NEW STRUCTURE
     Numbered list of sections in their new order, each one sentence.
     Mark whether each is on the homepage today, moved off (where to),
     or new. Don't add NEW scope — the existing sections are likely
     enough; the work is mostly subtraction + re-pacing.

  7. WHAT TO RETIRE (don't graduate from the diagnostic queue)
     For each of `interior`, `hoop`, `foothills`, `bento`, `aurora`,
     `parallax-bg`: should we re-enable on the homepage, move it
     elsewhere, or delete it entirely from the homepage's component
     vocabulary? Explain in one sentence each.

  8. ONE-DAY EXECUTION PLAN
     If Brendon approves your proposal, what's the smallest set of file
     changes that gets him to the new state? List 3-6 PRs in priority
     order, each titled, each scoped to "one PR session" worth of work.

HARD RULES

  - Audit only. Do not push code. Do not modify the diagnostic flag
    system in this pass.
  - Open both preview URLs above and actually look at them. The signal
    is in the live page, not the source.
  - Be willing to say "stop adding sections back; cut these instead."
    Brendon's stated frustration is noise, so the right answer is
    likely subtraction + re-pacing, not new components.
  - If the brand bar itself feels wrong (e.g. you think the page SHOULD
    be more cinematic and Brendon's "less noise" feedback is reacting
    to a specific bug, not the direction), say that and explain.
  - Be specific. "Remove ParallaxBackdrops" is better than "less
    parallax." Reference file paths.

  When done, reply with the proposal in this PR (#27 or whatever this
  ends up as) as a single comment. The website Claude Code session will
  pick it up from there.
```

## Open routing questions
- [ ] Should the diagnostic FX flag system survive this audit, or
      should the codex proposal explicitly include retiring it?
- [ ] Are there design-doc constraints from earlier (e.g. an outside
      art director's spec) that should pin certain decisions?
- [ ] Is `new.cbd.restaurant` going to share any of these components,
      and should the audit consider portability?

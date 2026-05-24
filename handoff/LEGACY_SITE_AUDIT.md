# Legacy buckmountaincannabis.com — Audit & Gap List

Compiled 2026-05-24 from Brendon's mobile screenshots + open-source
research (the live site is fully JS-rendered, so `WebFetch` returns
empty content — Chrome MCP rip is still required for the full inventory).

## Confirmed facts (from screenshots + public search hits)

| Item | Source | Status in rebuild |
|---|---|---|
| Logo: gold deer-skull antlers in purple triangle frame, "BUCK MTN" wordmark below | mobile screenshot | ✅ SVG placeholder shipped at `/brand/logo.svg`; needs real master from design source |
| Hero is a MULTI-SHOT looping video (interior greenhouse walk-through → aerial drone of the compound, not a single clip) | mobile screenshots | ⏳ component supports it; real video pending Chrome MCP rip |
| Hero overlay text: "Buck Mountain Cannabis" + "A legacy cannabis brand in the Sierra foothills of Nevada County, Ca." | mobile screenshot | ✅ exact copy in rebuild |
| Nav: logo top-left, "Blog" top-right (minimum) | mobile screenshot | ✅ extended to logo + Strains / Store / Blog / Loyalty / IG |
| Greenhouse 4-up gallery section (greenhouse interior, row aisle, FAVEN indoor lighting, aerial drone) | mobile screenshot | ⏳ image parallax stack has 5 slots; real photos pending Chrome MCP rip |
| Tagline: "Always Grinding for the Highest Quality" / "treating every batch like it's their last" | search results | ✅ in footer + Store page |
| Blog at `/blog` | search hit `https://www.buckmountaincannabis.com/blog` | ✅ stub at `/blog` |
| Instagram: `@buckmountaincannabis` (also `@buckmountain.cannabis`) | search results | ✅ linked in nav + footer |
| Merch line: "Always Grinding" Tees (3 colors) + Buck Mountain Tech Decks (2 colors, limited) | blog announcement, search results | ✅ catalog stub at `/store` |
| FAVEN-branded indoor lighting visible in cultivation photos | mobile screenshot | informational — useful for SEO content + agent reports |

## What the Chrome MCP rip needs to fill

Run `handoff/CHROME_MCP_RIP_PLAYBOOK.md` from the home machine to capture:

1. **Hero video master(s)** — the actual MP4(s) the legacy site is
   serving. The hero is at least 2 distinct shots; capture both and
   we'll pick the cleanest.
2. **Greenhouse 4-up gallery images** — interior, row aisle, FAVEN
   indoor, aerial drone.
3. **Logo SVG master** — replace `/brand/logo.svg` placeholder with the
   real export.
4. **Full nav inventory** — confirm whether there's anything beyond Blog
   in the top-right (Account, Cart, Strains, Contact, About).
5. **Footer content** — links, license #, address, copyright line.
6. **Complete blog post list + bodies** — to seed `blog_posts` table.
7. **Any "invisible" pages** — Squarespace/Webflow sites often have
   `/about`, `/contact`, `/faq`, `/locator`, `/wholesale`,
   `/coa-library` etc. that aren't linked from nav. Run:
   ```
   curl -s https://buckmountaincannabis.com/sitemap.xml
   curl -s https://buckmountaincannabis.com/robots.txt
   ```
   from a machine that gets a response (the sandbox returned empty).
8. **Pixel and analytics** — what GA/Meta/etc. snippets are loaded so we
   either reproduce or replace.

## Instagram

Public IG content can't be fetched from this sandbox without auth. From
the home machine:

- Pull the latest ~20 posts (image + caption + date) for the `posts/`
  archive
- Note the bio link tree
- Cross-reference recent posts with `strain_updates` rows we should seed

If Buck has an IG API access token (Meta Business — Brendon would have
set this up under his developer account), we can ingest IG posts via
the Basic Display API into a new `instagram_posts` table and surface
them on the homepage. That's a P3 task once the rest of the site is
solid.

## Competitor mobile-design notes (2026)

For reference when iterating:

- **Glasshouse Brands** (the largest CA flower brand) runs WordPress
  + Hello Theme Child. Classic horizontal nav, timeline-driven
  scroll narrative, NO advanced parallax. Investor-focused. Heavy
  on regulatory notices.
- **STIIIZY** leans into all-caps condensed type + silver/exclusive
  packaging cues.
- **Connected Cannabis** uses straightforward designer-strain storytelling.

Buck Mountain's differentiator is the LEGACY-farm-meets-skate-grind
through-line. Going aggressive on parallax + video + "always grinding"
merch is on-brand; chasing Glasshouse's investor template would dilute it.

## 2026 mobile-effect stack landed this sprint

- CSS scroll-driven animations (`animation-timeline: view()`) for
  reveal-on-scroll — graceful no-op in older browsers, no JS observer
- View Transitions API (`@view-transition { navigation: auto }`) for
  crossfade between routes
- Scroll-snap utilities (`.snap-page` class) ready when we want a
  full-section paging feel
- Sticky nav with scroll-direction hide/reveal + backdrop-blur
- iOS notch safe-area handling (`viewport-fit: cover`, `env(safe-area-inset-*)`)
- Theme color meta (`#0a0a0a`) so iOS Safari chrome matches the bg
- All effects respect `prefers-reduced-motion`

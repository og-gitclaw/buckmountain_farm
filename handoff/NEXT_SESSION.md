# NEXT SESSION — buckmountain.farm remaining work

> **Paste this to start a fresh session:**
> "Read `handoff/NEXT_SESSION.md` and pick up the remaining buckmountain.farm
> work. Start with §1 (cleanup), confirm with me before §3+."
>
> This brief is self-contained — it assumes the new session has read nothing
> else. Last updated end of the homepage-polish arc (homepage motion is done
> and live; main is at the post-PR-#30 state).

---

## 0 · Orientation (repo facts a cold session needs)

- **Repo:** `og-gitclaw/buckmountain_farm`. Next.js 15 (App Router) + React 19
  + Tailwind 4, Neon Postgres, deployed on Vercel via PR previews.
- **What it is:** Buck Mountain Cannabis brand site + commerce + QR rewards.
  Replaces the legacy buckmountaincannabis.com (Wix).
- **Scripts:** `npm run dev` (localhost:3000), `npm run build` (must pass
  before every push), `npm run lint`.
- **Auth model:** `getSession()` (signed `bm_session` JWT) + `isSuperAdmin()`
  allowlist (`lib/super-admin.ts`: mustwemuse@ + bmdistributionllc@). Never
  invent a new gate — reuse these.
- **Routes:** `app/admin/*` staff, `app/agent/*` field reps, `app/api/*/route.ts`.
- **DB:** `lib/db.ts` `dbConfigured()` + `getSql()`. Schema changes go in
  `db/migrations/NNN_*.sql` AND must be applied to Neon by hand (no auto-runner).
- **Integration boundaries (do not cross-wire):**
  - Marketing SMS/email → **Alpine IQ** (compliance)
  - Transactional email → **SES**
  - In-app push → **VAPID Web Push** (own channel, no Alpine IQ overlap)

### Working rules (enforced this whole project)
- Develop on a **branch per task** (`claude/<slug>`), open a **draft PR**, let
  Vercel build the preview, get Brendon's eyeball, then merge (squash).
- **Never push to main.** **Never force-push** shared branches.
- `next build` green **before** every push.
- Commit footer + PR body end with the session URL line (this repo's convention).
- For anything outward-facing or hard to reverse (merging, closing PRs,
  deleting), **confirm with Brendon first** — he gates merges explicitly.

---

## 1 · Cleanup (do first — clears the GitHub queue to zero)

Two open PRs, both **superseded**; close them (Brendon to confirm):

| PR | Branch | Why close |
| :-- | :-- | :-- |
| **#23** Hero video autoplay priority | `claude/video-load-priority` | The hero `preload="auto"` + below-fold lazy-load it proposed already landed on main via PR #29 (load-on-demand) + the codex hero refactor. Nothing left to merge. |
| **#22** Og Canna Signal ingest brief | `claude/og-canna-ingest` | Brendon decided against the Signal-Desktop extract path ("I'll just upload files to the openclaw media ingestor folder"). The doc describes a workflow he doesn't want. Close, or merge as historical record — his call. |

After this, **0 open PRs.**

---

## 2 · Activation ops (not code — turns on already-built features)

1. **Apply `db/migrations/003_push_fault_injection.sql` to Neon.** Until run,
   the merged super-admin push-throttle UI (`/admin/push-throttle`) has no
   table to read/write — it silently no-ops. One-time `psql`/Neon-console run.
2. **Drop flower-bag videos into the openclaw media ingestor folder.** chl0e
   (openclaw orchestrator session, Brendon's Mac) OCRs the black-sharpie strain
   label from the last ~2s of each clip, transcodes the cinematic derivatives,
   and POSTs them to `POST /api/admin/assets`
   (Bearer `ADMIN_ASSET_INGEST_TOKEN`, schema `buckmountain-farm/asset/v1`)
   tagged `strain:<slug>` + `role:{poster|loop|cine}`. The website scaffold is
   already merged: `data/strains.ts` has `poster_url` / `tile_loop_url` /
   `cinematic_url` fields, and `/strains` + `/strains/[slug]` render them the
   moment they're populated. **Nothing to code here — it's a content drop.**
   (Full pipeline spec: `handoff/CINEMATIC_STRAIN_PREVIEWS.md`.)

---

## 3 · The backlog (each `handoff/*.md` is a real, scoped project)

Ranked by what unblocks revenue / launch first. Pick one per session; each is
roughly one feature / one PR.

| Priority | Doc | What it delivers |
| :-- | :-- | :-- |
| **P0** | `PROD_PROMOTE.md` | Pre-launch checklist to flip buckmountain.farm fully public (deployment-protection off, env vars, DNS, the migration above). |
| **P0** | `LEGACY_REDIRECTS.md` | 301 map from buckmountaincannabis.com → new URLs so SEO equity transfers at cutover. Pairs with `LEGACY_SITE_AUDIT.md`. |
| **P1** | `NABIS_API_SETUP.md` | Wholesale order pipeline (the `/admin/orders` data source). Real revenue path. |
| **P1** | `ALPINE_IQ_INTEGRATION.md` | Marketing SMS/email transport (TCPA-compliant). The consent plumbing already exists; this wires the sender. |
| **P2** | `IG_MENTIONS_INGESTION.md` | Instagram hashtag → homepage feed auto-ingest. |
| **P2** | `MOBILE_FX_PLAN.md` | Next round of mobile polish on the new homepage. |
| **P2** | `CLIENT_DISPENSARY_DB_DESIGN.md` | Dispensary-side schema (drops / placement). |
| ref | `WEB_PUSH_VAPID.md`, `TRANSACTIONAL_EMAIL_WORKFLOW.md`, `GOOGLE_SSO_OGLIFE_CONSENT.md`, `HETZNER_MAIL_SETUP.md`, `QR_STICKER_WORKFLOW.md`, `RIP_LEGACY_RUNBOOK.md`, `CHROME_MCP_RIP_PLAYBOOK.md`, `DOMAIN_SELECTION.md` | Mostly built or reference runbooks — read before touching the related surface. |

When the queue gets unwieldy again, re-run `handoff/SESSION_PLAN_PROMPT.md` to
re-slice everything into per-PR session prompts.

---

## 4 · What's already DONE (don't redo)

**Homepage (the long polish arc — all live on main):**
- Restructured layout: hero → Inside-the-Room framed card → Strain Updates →
  Philosophy card → Hoop Dreams → What's Flowering bento → Foothills → FAQ.
- Sub-viewport hero, scroll-linked fade-away, ref-mutated parallax (no
  per-frame React re-renders), `scroll-behavior: smooth`.
- Strain Updates parallax tuned to 0.65 travel / 0.08 ease (shared
  `lib/use-smooth-parallax.ts` lerp damping).
- Videos load on demand (only hero on land; rest `preload="none"` +
  IO-triggered play). "Inside the room" plays only when fully in view.
- Divider flicker fix, iOS `svh` sizing, scrim hand-offs, diagnostic `?fx=`
  flag system (opt-in, hidden from public).
- Strain detail pages scaffolded for chl0e's cinematics (§2.2).

**Plumbing shipped earlier in the project:**
Session JWT signing · `/admin/agents` role UI · `/account/settings` consent ·
loyalty redeem · `/agent/menu-placement` · Web Push retry + super-admin fault
injection (UI merged; **migration pending — §2.1**) · SES bounce/complaint
webhook · nightly Neon backup · per-strain notify-me.

---

## 5 · Suggested first move for the new session

1. Confirm with Brendon: close #22 + #23.
2. Apply migration 003 to Neon (or confirm Brendon has).
3. Then ask which backlog item (§3) to start — recommend **`PROD_PROMOTE.md`**
   if launch is the near-term goal, else **`NABIS_API_SETUP.md`** for revenue.

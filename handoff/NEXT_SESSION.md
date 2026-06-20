# NEXT SESSION — buckmountain.farm remaining work

> **Paste this to start a fresh session:**
> "Read `handoff/NEXT_SESSION.md` and pick up the remaining buckmountain.farm
> work. §1 (cleanup) and §2.1 (DB) are DONE — start by confirming with me
> which §3 backlog item to build."
>
> This brief is self-contained — it assumes the new session has read nothing
> else. Last updated **2026-06-19** at the end of the cleanup + DB-provisioning
> session: GitHub queue is at 0 open PRs and the Neon database is live.

---

## 0 · Orientation (repo facts a cold session needs)

- **Repo:** `og-gitclaw/buckmountain_farm`. Next.js 15 (App Router) + React 19
  + Tailwind 4, Neon Postgres, deployed on Vercel via PR previews.
- **What it is:** Buck Mountain Cannabis brand site + commerce + QR rewards.
  Replaces the legacy buckmountaincannabis.com (Next.js SPA behind Cloudflare —
  NOT Squarespace, per `LEGACY_SITE_AUDIT.md`).
- **Scripts:** `npm run dev` (localhost:3000), `npm run build` (must pass
  before every push), `npm run lint`.
- **Auth model:** `getSession()` (signed `bm_session` JWT) + `isSuperAdmin()`
  allowlist (`lib/super-admin.ts`: mustwemuse@ + bmdistributionllc@). Never
  invent a new gate — reuse these.
- **Routes:** `app/admin/*` staff, `app/agent/*` field reps, `app/api/*/route.ts`.
- **DB (LIVE as of 2026-06-19):** `lib/db.ts` `dbConfigured()` + `getSql()`,
  driver `@neondatabase/serverless` (probes `DATABASE_URL_UNPOOLED` →
  `DATABASE_POSTGRES_URL` → `DATABASE_URL` → `POSTGRES_URL`).
  - **Neon project:** `buckmountain-farm` / `bold-hill-17774655` (org
    mustwemuse@, **free tier** — 0.5 GB storage, 100 CU-hours/mo, scale-to-zero;
    no inactivity deletion). Branch `main` (`br-spring-sun-atmmqnc9`), db `neondb`.
  - **Applied:** `db/schema.sql` + `001` + `002` + `003` (26 tables,
    `push_fault_injection` seeded). All migrations are idempotent
    (`CREATE TABLE IF NOT EXISTS`); safe to re-run.
  - **Vercel envs:** the 3 connection vars + `DATABASE_NEON_PROJECT_ID` are wired
    for **Preview + Development only**. **Production is intentionally NOT wired**
    — add it as the first step of `PROD_PROMOTE.md` at launch.
  - Schema changes still go in `db/migrations/NNN_*.sql` AND must be applied to
    Neon by hand (no auto-runner): `psql "$DATABASE_URL_UNPOOLED" -f db/migrations/NNN_*.sql`.
- **Integration boundaries (do not cross-wire):**
  - Marketing SMS/email → **Alpine IQ** (compliance)
  - Transactional email → **SES**
  - In-app push → **VAPID Web Push** (own channel, no Alpine IQ overlap)

### Working rules (enforced this whole project)
- Develop on a **branch per task** (`claude/<slug>`), open a **draft PR**, let
  Vercel build the preview, get Brendon's eyeball, then merge (squash).
- **Never push to main.** **Never force-push** shared branches.
- `next build` green **before** every push.
- For anything outward-facing or hard to reverse (merging, closing PRs,
  deleting), **confirm with Brendon first** — he gates merges explicitly.

---

## 1 · Cleanup — ✅ DONE (2026-06-19)

The GitHub queue is at **0 open PRs**.

| PR | Branch | Outcome |
| :-- | :-- | :-- |
| **#23** Hero video autoplay priority | `claude/video-load-priority` | **Closed** — superseded by #29 (load-on-demand) + #30; branch had conflicted with main. |
| **#22** Og Canna Signal ingest brief | `claude/og-canna-ingest` | **Closed** — Brendon chose the openclaw media-ingestor drop over the Signal-Desktop extract path. |
| **#31** This handoff brief | `claude/next-session-handoff` | **Merged** (squash) — the doc the prior session left behind, now corrected to match reality. |

> Note: the prior version of this doc claimed "2 open PRs → 0 after closing."
> There were actually **3** — it missed its own PR (#31). Fixed here.

---

## 2 · Activation ops (not code — turns on already-built features)

1. **Apply migration 003 to Neon — ✅ DONE (2026-06-19).** The whole DB was
   provisioned this session (it never existed before; the Vercel env keys were
   empty placeholders). `push_fault_injection` exists + seeded, so
   `/admin/push-throttle` now reads/writes a real table on preview.
2. **Drop flower-bag videos into the openclaw media ingestor folder.** ← still TODO.
   chl0e (openclaw orchestrator session, Brendon's Mac) OCRs the black-sharpie
   strain label from the last ~2s of each clip, transcodes the cinematic
   derivatives, and POSTs them to `POST /api/admin/assets`
   (Bearer `ADMIN_ASSET_INGEST_TOKEN`, schema `buckmountain-farm/asset/v1`)
   tagged `strain:<slug>` + `role:{poster|loop|cine}`. The website scaffold is
   already merged: `data/strains.ts` has `poster_url` / `tile_loop_url` /
   `cinematic_url` fields, and `/strains` + `/strains/[slug]` render them the
   moment they're populated. **Nothing to code here — it's a content drop.**
   (Full pipeline spec: `handoff/CINEMATIC_STRAIN_PREVIEWS.md`.)

---

## 3 · The backlog (each `handoff/*.md` is a real, scoped project)

Ranked by what unblocks revenue / launch first. Pick one per session; each is
roughly one feature / one PR. **Key finding (2026-06-19 audit):** nearly every
item below is already coded fail-open and blocked on an external credential or a
manual toggle — not on engineering.

| Priority | Doc | What it delivers | Blocked on |
| :-- | :-- | :-- | :-- |
| **P0** | `PROD_PROMOTE.md` | Flip buckmountain.farm public (deployment-protection off, **wire prod `DATABASE_*` envs**, DNS). | Randy review + Brendon's toggle. One reversible switch. |
| **P0** | `LEGACY_REDIRECTS.md` | 301 map → new URLs so SEO equity transfers. On-domain rules already in `next.config.ts`; legacy-host half remains. Pairs with `LEGACY_SITE_AUDIT.md` (legacy = Next SPA + Cloudflare, not Squarespace). | Brendon at home machine w/ Cloudflare + GSC access. |
| **P1** | `NABIS_API_SETUP.md` | Wholesale order pipeline (revenue). Code is BUILT (`lib/nabis.ts`, cron sync, `nabis_sync` table). | A Nabis-org admin emailing help@nabis.com for an API key (~1 biz day). |
| **P1** | `ALPINE_IQ_INTEGRATION.md` | Marketing SMS/email transport (TCPA). Code BUILT, fail-open. | Brendon creates a sub-audience + key in the existing OG Life Alpine IQ tenant (PID 4381). |
| **P2** | `IG_MENTIONS_INGESTION.md` | Instagram hashtag → `/drops` feed. Code BUILT. | Meta app + App Review (`instagram_manage_insights`). |
| **P2** | `MOBILE_FX_PLAN.md` | Mobile polish. Phase 1 shipped on `claude/mobile-polish`. | Nothing — pure front-end; Phase 3 gated post-launch. |
| **P2** | `CLIENT_DISPENSARY_DB_DESIGN.md` | Dispensary CRM. Schema BUILT (now live in Neon). | Seed dispensaries from a Nabis CSV (pairs with NABIS). |
| ref | `WEB_PUSH_VAPID.md`, `TRANSACTIONAL_EMAIL_WORKFLOW.md`, `GOOGLE_SSO_OGLIFE_CONSENT.md`, `HETZNER_MAIL_SETUP.md`, `QR_STICKER_WORKFLOW.md`, `RIP_LEGACY_RUNBOOK.md`, `CHROME_MCP_RIP_PLAYBOOK.md`, `DOMAIN_SELECTION.md` | Mostly built or reference runbooks — read before touching the related surface. | — |

When the queue gets unwieldy again, re-run `handoff/SESSION_PLAN_PROMPT.md` to
re-slice everything into per-PR session prompts.

---

## 4 · What's already DONE (don't redo)

**Infra (2026-06-19 session):**
- Neon DB provisioned + schema + 001–003 applied; Preview/Dev envs wired (§0, §2.1).
- GitHub queue cleared to 0 open PRs (§1).

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
injection (table now live — §2.1) · SES bounce/complaint webhook · nightly Neon
backup · per-strain notify-me.

---

## 5 · Suggested first move for the new session

1. Cleanup (§1) and DB (§2.1) are DONE — don't redo them.
2. Confirm with Brendon which §3 backlog item to start. Recommended:
   **`PROD_PROMOTE.md`** (launch; its first step is wiring the prod `DATABASE_*`
   envs — same Neon project `bold-hill-17774655`) **plus** firing off the
   **`NABIS_API_SETUP.md`** key request the same day (long external pole, code
   already built).
3. Still outstanding ops: the §2.2 flower-bag video drop (Brendon → openclaw).

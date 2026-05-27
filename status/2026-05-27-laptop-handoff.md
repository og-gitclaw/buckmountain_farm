# Buck Mountain Cannabis — Laptop Handoff (2026-05-27)

You are picking up the buckmountain.farm rebuild on your laptop from a
sandboxed cloud-Claude session. Everything below is committed to
`main` — `git clone` and you've got the whole thing.

## Repo

- **GitHub:** https://github.com/og-gitclaw/buckmountain_farm
- **Local clone:** `git clone https://github.com/og-gitclaw/buckmountain_farm.git ~/buckmountain_farm && cd ~/buckmountain_farm`
- **Branch posture:** `main` is the production deploy. Feature work
  always on its own branch with the convention
  `claude/<short-name>` → PR → squash-merge.
- **Last merged PR:** #2 (homepage FX v2 — scroll-scrubbed video,
  aurora mesh, grain overlay, bento grid, magnetic buttons, real Buck
  Mtn logo + bigger header). Squashed commit on main.

## What's live + what isn't

The site is at https://buckmountain.farm but **auth-walled** by Vercel
Deployment Protection (Randy gate). Team-logged-in browser sees content;
public visitors get a Vercel login wall. Production deploys from `main`.

Health snapshot at `/api/health` (signed-in team only, or `vercel curl`):

```
✅ database           Neon Postgres (shared neon-cerulean-ridge cluster)
✅ alpineiq           Big Moose Hemp tenant 4381 (API key live)
✅ google_oauth       fresh GCP project "buckmountain-farm" (testing mode)
✅ web_push           VAPID keys generated
✅ admin_ingest_token openssl rand -hex 32
✅ admin_api_token    openssl rand -hex 32
✅ session_secret     openssl rand -hex 32
✅ blob_storage       Vercel Blob (Private, iad1)
❌ nabis              cultivator handoff pending
❌ metrc              compliance API key pending
❌ ses_transactional  AWS SES creds pending
```

## Tech stack

- **Framework:** Next.js 15.5 App Router, React 19, Tailwind 4
- **DB:** Neon Postgres via `@neondatabase/serverless` (HTTP for one-shots,
  WebSocket Pool for transactions). Schema in `db/schema.sql`,
  migrations in `db/migrations/`.
- **Auth:** Google OAuth → HMAC-signed CSRF state → httpOnly
  `bm_session` cookie. `lib/session.ts` is the single read path.
- **Identity:** `oglife_optins` keyed by Google `sub`, `consents jsonb`
  for OG Life cross-brand network.
- **Email:** AWS SES v2 via `@aws-sdk/client-sesv2` (externalized in
  next.config.ts to keep function bundles small). 15 templates in
  `lib/email/templates.ts`. Audit log in `emails_outbound` table.
- **SMS marketing:** Alpine IQ (Big Moose Hemp tenant). SES stays
  transactional-only per directive.
- **Web Push:** VAPID via `web-push`. `lib/push.ts` fans out from
  `push_subscriptions` and auto-retires 404/410 endpoints.
- **Loyalty:** QR sticker pre-allocation via `/agent/qr/request` →
  Photoshop renders sheets → openclaw watcher decodes + POSTs to
  `/api/admin/qr-sheets` → scans land at `/loyalty/scan/[token]` → SSO
  claim at `/loyalty/claim/[token]` → points via `rewards_ledger`.
- **Defensive build:** `next.config.ts` `serverExternalPackages` for
  `@aws-sdk/*` + `@neondatabase/serverless` + `web-push` keeps each
  function under Vercel's per-function size cap. Admin/agent DB-touching
  pages use `force-dynamic` + try/catch around SQL so a schema lag never
  breaks the build.

## 50 routes (the IA)

Public:
```
/                         hero video parallax + StrainUpdates + scroll-scrubbed
                          video + 2 VideoScenes + BentoStrainGrid + aurora tail
/strains, /strains/[slug] Leafly-style: lineage tree, effect bars 0-100,
                          family/type chips, related-by-family grid
/strains/updates          live feed of strain_updates rows
/drops                    where strains are on shelves right now (manual
                          + IG hashtag auto-ingest)
/store                    Always Grinding tees + Tech Decks, procedural
                          placeholders until real product photos land
/blog, /blog/[slug]       3 SEO-preserved slugs from legacy site
/loyalty                  scan-to-claim explainer
/loyalty/account          customer dashboard (balance, scans, subs)
/loyalty/scan/[token]     anonymous scan landing
/loyalty/claim/[token]    post-SSO point credit
/about                    legacy farm + gallery
/contact                  three-channel email
/wholesale                dispensary brochure
/coa                      Metrc tag lookup
/privacy, /terms          21+, TCPA, CCPA aware
/auth/consent             post-SSO opt-in defaults
/not-found                branded 404
```

Agent portal:
```
/agent                    landing
/agent/dispensaries       list (live DB)
/agent/dispensaries/[id]  detail (orders + visits + scans)
/agent/orders             Nabis pipeline (waits for cred)
/agent/notifications      compose new-drop blast
/agent/visit-report       field-rep form
/agent/qr/request         token allocation form
/agent/loyalty            scan activity by city
```

Admin:
```
/admin                    landing
/admin/assets             openclaw watcher feed
/admin/strain-updates     compose homepage feed entries
/admin/orders             admin-scope Nabis pipeline
/admin/qr-sheets          ingested print sheets
/admin/drops              manual current-drops entry
/admin/emails             SES outbound log + test send
```

APIs:
```
/api/health
/api/auth/google + /api/auth/google/callback + /api/auth/consent
/api/loyalty/scan/[token] + /api/loyalty/claim/[token]
/api/notifications/{subscribe,new-product}
/api/sms/subscribe
/api/push/subscribe
/api/agent/{visit-report,qr/request}
/api/admin/{assets,qr-sheets,strain-updates,drops}
/api/coa/lookup
/api/nabis/orders
/api/alpineiq/webhook (HMAC-verified)
/api/cron/nabis-sync (hourly when wired)
/api/email/test
```

## What's outstanding (in priority order)

### 🔴 Procurement (only Brendon can move)
- AWS SES creds → flips ses_transactional, 15 email templates start sending
- Nabis API key + Org ID → flips order pipeline + lifecycle emails
- Metrc user key → flips COA validation
- IG Graph API token + user ID → `/drops` auto-populate (script ready at `scripts/ingest-ig-mentions.mjs`)
- Alpine IQ webhook secret + default audience id
- `CRON_SECRET` (`openssl rand -hex 32`) in Vercel env

### 🟡 Brendon-only decisions
- Legacy `buckmountaincannabis.com` retire-or-keep (handoff/LEGACY_REDIRECTS.md)
- OAuth consent screen: testing → published
- Public-launch toggle (Vercel Deployment Protection OFF — Randy gate)
- Store backend: Shopify vs BigCommerce vs Square
- Domain final pick (currently buckmountain.farm — handoff/DOMAIN_SELECTION.md)

### 📸 Content gaps (design / cultivator team)
- Per-strain hero photos → `public/assets/strains/<slug>.jpg` + set
  `hero_image_url` in `data/strains.ts`
- Per-strain 3s micro-loops for the bento grid → `public/assets/strains/<slug>.mp4`
  + wire `videoForSlug={{…}}` on `<BentoStrainGrid>` in `app/page.tsx`
- Real product photos for `/store` (tees + tech decks)
- Strain SEO research — 8 of 11 strains still `needs-research` or
  `needs-cultivator` (`docs/research/strain-seo-matrix.md`)
- Real blog post bodies (3 stubs, slug-preserved for SEO)
- Founder/team photo for `/about`
- COA PDFs → Vercel Blob → wired into `batches.coa_url`

### 🔧 Code/architecture followups (you can ship these)
- `/agent/menu-placement` — Weedmaps/Leafly scrape audit
- `/admin/agents` — role assignment UI (currently SQL only)
- `/account/settings` — customer-side consent editing
- Per-strain "notify me" button on `/strains/[slug]`
- `/loyalty/account` redeem-points UI (ledger supports negative entries)
- Session JWT signing (currently base64url placeholder, needed pre-launch)
- SES bounce/complaint webhook (`/api/ses/webhook` → SNS)
- Push delivery retry on transient endpoint errors
- Nightly `pg_dump` → S3 backup (GitHub Action)
- Mobile Safari QA pass on the new FX

## Where to read more

```
handoff/
  HOMEPAGE_FX.md                    new effect toolkit + dial knobs
  TRANSACTIONAL_EMAIL_WORKFLOW.md   SES setup + 15-template lifecycle
  ALPINE_IQ_INTEGRATION.md          marketing channel separation
  GOOGLE_SSO_OGLIFE_CONSENT.md      OAuth + consent defaults
  NABIS_API_SETUP.md                cultivator handoff
  IG_MENTIONS_INGESTION.md          /drops auto-ingest setup
  QR_STICKER_WORKFLOW.md            Photoshop → openclaw → backend
  WEB_PUSH_VAPID.md                 push subscribe + fan-out
  LEGACY_REDIRECTS.md               Squarespace + BigCommerce 301s
  CLIENT_DISPENSARY_DB_DESIGN.md    schema rationale
  LEGACY_SITE_AUDIT.md              what we know about the old site
  RIP_LEGACY_RUNBOOK.md             scripts/rip_legacy.mjs how-to
  PROD_PROMOTE.md                   the public-launch toggle ceremony
  HETZNER_MAIL_SETUP.md             mail.oglife.app DNS

status/
  2026-05-19.md                     sprint 1 (provision)
  2026-05-24.md, 24b.md, 24c.md     sprints 2-5
  2026-05-27-laptop-handoff.md      this file

docs/research/
  strain-seo-matrix.md              SKU × strain mapping
  nabis-vs-internal-distro.md       distribution memo

db/
  schema.sql                        full DDL (22 tables)
  migrations/001_emails_orders_drops.sql
```

## Local dev quickstart

```bash
cd ~/buckmountain_farm
cp .env.example .env.local
# Fill in DATABASE_URL_UNPOOLED + GOOGLE_OAUTH_CLIENT_ID/SECRET +
# SESSION_SECRET at minimum. Everything else is fail-open — missing
# vars just disable that feature, never crash.

npm install
npm run dev
# → http://localhost:3000

# Verify the integration map:
curl http://localhost:3000/api/health | jq
```

## Cross-machine continuity

The cloud-Claude session that built most of this is in a sandboxed
container — no Tailscale, no openclaw access, no AWS console. When you
work on the laptop, you have:

- Full git access (push directly to feature branches)
- Vercel CLI + dashboard
- Chrome MCP if you have it configured locally
- AWS / Google Cloud / Alpine IQ admin consoles
- The actual photo + video assets on disk

So the laptop side is where credential work + real asset ingest + Vercel
log retrieval happens. Code changes can flow either direction via PR.

## Reporting protocol (so cloud-Claude can pick up if needed)

If you start cloud-Claude on this repo from the web again, point it at
the latest status log in `status/` for the current state. Push commits
to feature branches; cloud-Claude wakes on PR webhooks if subscribed.

-- buckmountain.farm — Neon Postgres schema
-- Provision via Vercel Marketplace → Neon Postgres.
-- Run order: this file via `psql $DATABASE_URL_UNPOOLED -f db/schema.sql`.
--
-- Design notes:
--   * `assets` is the ingestion endpoint table — populated by the openclaw
--     watcher via POST /api/admin/assets. SHA-256 is the natural key.
--   * `products` mirrors the BigCommerce CSV (products-2026-05-18.csv) so
--     we can sync without losing the existing /award-winning-rosin-... URLs
--     for SEO continuity.
--   * `batches` ties a product SKU + run-date to a Metrc package tag —
--     the unit a QR code represents.
--   * `qr_tokens` is what gets printed on the jar. One token = one batch.
--     Scanning the QR resolves the token → batch → product → COA + rewards.
--   * `qr_scans` is the event log. Append-only, used for both analytics
--     and rewards eligibility ("first scan per device wins").
--   * `oglife_optins` records who opted in via OGLife.app after scanning.
--   * `rewards_ledger` is the double-entry ledger of tokens earned + spent.

-- ====================================================================
-- assets — media files ingested from openclaw
-- ====================================================================
CREATE TABLE IF NOT EXISTS assets (
  id              text PRIMARY KEY,                    -- first 16 hex chars of sha256, matches watcher
  sha256          text UNIQUE NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('image', 'video', 'other')),
  bucket          text NOT NULL,                       -- e.g. 'buckmountain', 'lgp', 'misc'
  route           text NOT NULL CHECK (route IN ('trusted', 'cross-folder-match')),
  file_name       text NOT NULL,
  file_ext        text NOT NULL,
  size_bytes      bigint NOT NULL,
  mtime           timestamptz NOT NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  source_host     text NOT NULL,
  source_path     text NOT NULL,
  blob_url        text,                                -- populated when staged to Vercel Blob
  thumbnail_url   text,
  review_status   text NOT NULL DEFAULT 'pending'      -- pending | approved | rejected
                    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  linked_strain   text,                                -- FK-ish to products.strain_slug
  linked_product  bigint REFERENCES products(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  reviewed_by     text
);
CREATE INDEX IF NOT EXISTS assets_bucket_idx        ON assets (bucket);
CREATE INDEX IF NOT EXISTS assets_review_status_idx ON assets (review_status);
CREATE INDEX IF NOT EXISTS assets_tags_gin          ON assets USING gin (tags);
CREATE INDEX IF NOT EXISTS assets_linked_strain_idx ON assets (linked_strain);

-- ====================================================================
-- products — mirrors BigCommerce export, expanded for our SEO layer
-- ====================================================================
CREATE TABLE IF NOT EXISTS products (
  id              bigint PRIMARY KEY,                  -- BigCommerce Product ID
  sku             text UNIQUE,
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  brand           text NOT NULL DEFAULT 'Buck Mountain Cannabis',
  category        text NOT NULL CHECK (category IN (
                    'flower', 'rosin', 'extracts', 'trim', 'smalls', 'vape', 'pharma'
                  )),
  strain_slug     text,                                -- canonical strain key (gelato-41, permanent-og, ...)
  description     text,
  retail_price    numeric(10,2),
  sale_price      numeric(10,2),
  weight_g        numeric(10,3),
  is_visible      boolean NOT NULL DEFAULT true,
  is_purchasable  boolean NOT NULL DEFAULT true,
  legacy_url      text,                                -- original cbd.restaurant /product-url/
  seo_title       text,
  seo_description text,
  seo_keywords    text[],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_strain_idx   ON products (strain_slug);

-- ====================================================================
-- strains — research / SEO content per genetic line
-- (one row per strain; many products share a strain)
-- ====================================================================
CREATE TABLE IF NOT EXISTS strains (
  slug              text PRIMARY KEY,                  -- 'gelato-41', 'permanent-og'
  name              text NOT NULL,
  lineage           text,                              -- 'Sunset Sherbet × Thin Mint GSC'
  type              text CHECK (type IN ('indica', 'sativa', 'hybrid', 'indica-dominant', 'sativa-dominant')),
  terpene_profile   jsonb,                             -- {"caryophyllene": 0.34, ...}
  flavor_notes      text[],
  effect_notes      text[],
  leafly_url        text,
  weedmaps_url      text,
  seedfinder_url    text,
  thc_typical_pct   numeric(5,2),
  cbd_typical_pct   numeric(5,2),
  long_description  text,                              -- SEO-ready narrative
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- batches — a single run of a product. The QR-code unit.
-- ====================================================================
CREATE TABLE IF NOT EXISTS batches (
  id                  bigserial PRIMARY KEY,
  product_id          bigint NOT NULL REFERENCES products(id),
  metrc_package_tag   text UNIQUE,                     -- 1A4FF010000XXXXXXXXXXXXX
  run_date            date,
  harvest_date        date,
  package_date        date,
  coa_url             text,                            -- PDF link to certificate of analysis
  coa_tested_at       timestamptz,
  nabis_inventory_id  text,                            -- correlates with Nabis /inventories
  qty_units           integer,                         -- jars produced
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS batches_product_idx ON batches (product_id);
CREATE INDEX IF NOT EXISTS batches_metrc_idx   ON batches (metrc_package_tag);

-- ====================================================================
-- qr_sheets — one row per print sheet ingested from the Photoshop team.
--
-- Workflow (Brendon 2026-05-24):
--   Photoshop dev team generates sticker sheets (50-75+ tokens each),
--   saves PNG/JPG export to a synced folder. Openclaw (via Tailscale)
--   watches the folder, OCRs/decodes the QR codes in the sheet image,
--   and POSTs { sheet_image_url, tokens[] } to /api/admin/qr-sheets.
--   That endpoint UPSERTs each token into qr_tokens (batch_id NULL =
--   authenticity-only). One row in qr_sheets per sheet → audit trail
--   of which sheet a token came from.
-- ====================================================================
CREATE TABLE IF NOT EXISTS qr_sheets (
  id              bigserial PRIMARY KEY,
  sheet_code      text UNIQUE,                          -- printer-side label, e.g. "BMC-2026-W21-A03"
  asset_id        text REFERENCES assets(id),           -- the openclaw-ingested sheet image
  printer         text,                                  -- 'photoshop-team', 'in-house', etc.
  token_count     integer NOT NULL DEFAULT 0,
  generated_at    timestamptz,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  notes           text
);

-- ====================================================================
-- qr_tokens — what's printed on the sticker.
--
-- v1 scope: AUTHENTICITY ONLY. Each token pre-registered before printing
--   so a scan can be confirmed real. batch_id is OPTIONAL — we add it
--   later if we move to per-jar product tracking.
-- v2 scope: link token → batch_id when jars are filled and capped.
-- ====================================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
  token         text PRIMARY KEY,                       -- 12-char nanoid, URL-safe
  sheet_id      bigint REFERENCES qr_sheets(id),        -- which print sheet this came from
  batch_id      bigint REFERENCES batches(id),          -- nullable in v1 (authenticity-only)
  printed_at    timestamptz NOT NULL DEFAULT now(),
  is_active     boolean NOT NULL DEFAULT true,
  retired_at    timestamptz
);
CREATE INDEX IF NOT EXISTS qr_tokens_batch_idx ON qr_tokens (batch_id);
CREATE INDEX IF NOT EXISTS qr_tokens_sheet_idx ON qr_tokens (sheet_id);

-- ====================================================================
-- qr_scans — append-only event log
-- ====================================================================
CREATE TABLE IF NOT EXISTS qr_scans (
  id              bigserial PRIMARY KEY,
  token           text NOT NULL REFERENCES qr_tokens(token),
  scanned_at      timestamptz NOT NULL DEFAULT now(),
  ip_hash         text,                                -- SHA-256(ip+daily-salt), no raw PII
  user_agent      text,
  device_fp_hash  text,                                -- if available, for dedupe
  geo_city        text,
  geo_country     text,
  optin_id        bigint                               -- backfilled if scanner opted-in
);
CREATE INDEX IF NOT EXISTS qr_scans_token_idx     ON qr_scans (token);
CREATE INDEX IF NOT EXISTS qr_scans_scanned_at    ON qr_scans (scanned_at);

-- ====================================================================
-- oglife_optins — bridge to OGLife.app accounts
-- ====================================================================
CREATE TABLE IF NOT EXISTS oglife_optins (
  id              bigserial PRIMARY KEY,
  oglife_user_id  text NOT NULL UNIQUE,                -- foreign system ID
  email           text,                                -- mirrored, hashed for matching
  phone_hash      text,
  first_scan_id   bigint REFERENCES qr_scans(id),
  opted_in_at     timestamptz NOT NULL DEFAULT now(),
  consents        jsonb NOT NULL DEFAULT '{}'::jsonb   -- {marketing: true, sms: false, ...}
);

-- ====================================================================
-- rewards_ledger — double-entry, +N earned, -N redeemed
-- ====================================================================
CREATE TABLE IF NOT EXISTS rewards_ledger (
  id              bigserial PRIMARY KEY,
  optin_id        bigint NOT NULL REFERENCES oglife_optins(id),
  delta_tokens    integer NOT NULL,                    -- +/-
  reason          text NOT NULL,                       -- 'scan-bonus', 'referral', 'redeem-discount', ...
  related_scan_id bigint REFERENCES qr_scans(id),
  related_order   text,                                -- external order ref
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (delta_tokens <> 0)
);
CREATE INDEX IF NOT EXISTS rewards_optin_idx ON rewards_ledger (optin_id);

-- ====================================================================
-- nabis_sync — cache of Nabis API pulls (orders/inventory/invoices)
-- ====================================================================
CREATE TABLE IF NOT EXISTS nabis_sync (
  resource        text NOT NULL,                       -- 'orders' | 'inventories' | 'invoices' | ...
  external_id     text NOT NULL,                       -- Nabis-side ID
  payload         jsonb NOT NULL,
  pulled_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resource, external_id)
);
CREATE INDEX IF NOT EXISTS nabis_sync_pulled_idx ON nabis_sync (pulled_at);

-- ====================================================================
-- dispensaries — every CA shop (and future states) we sell into.
-- Mirrors BMH's account-management backend.
-- ====================================================================
CREATE TABLE IF NOT EXISTS dispensaries (
  id                text PRIMARY KEY,                   -- short slug, e.g. 'sf-tha-hi'
  name              text NOT NULL,
  legal_name        text,
  license_number    text UNIQUE,                        -- CDPH / DCC license
  state             text NOT NULL DEFAULT 'CA',
  city              text,
  address           text,
  lat               numeric(10,6),
  lng               numeric(10,6),
  buyer_name        text,
  buyer_email       text,
  buyer_phone       text,
  weedmaps_url      text,
  leafly_url        text,
  menu_url          text,
  status            text NOT NULL DEFAULT 'lead'        -- lead | active | lapsed | dropped
                      CHECK (status IN ('lead', 'active', 'lapsed', 'dropped')),
  last_order_at     timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispensaries_state_idx  ON dispensaries (state);
CREATE INDEX IF NOT EXISTS dispensaries_status_idx ON dispensaries (status);

-- ====================================================================
-- agents — field reps / brand ambassadors with portal access
-- ====================================================================
CREATE TABLE IF NOT EXISTS agents (
  id              bigserial PRIMARY KEY,
  google_sub      text UNIQUE NOT NULL,                 -- Google OAuth sub (stable user id)
  email           text NOT NULL,
  display_name    text,
  role            text NOT NULL DEFAULT 'rep'          -- rep | manager | admin
                    CHECK (role IN ('rep', 'manager', 'admin')),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);

-- ====================================================================
-- agent_dispensary_assignments — many-to-many, which agent covers which shop
-- ====================================================================
CREATE TABLE IF NOT EXISTS agent_dispensary_assignments (
  agent_id        bigint NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  dispensary_id   text NOT NULL REFERENCES dispensaries(id) ON DELETE CASCADE,
  is_primary      boolean NOT NULL DEFAULT false,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, dispensary_id)
);

-- ====================================================================
-- visit_reports — what an agent files after visiting a shop
-- ====================================================================
CREATE TABLE IF NOT EXISTS visit_reports (
  id              bigserial PRIMARY KEY,
  agent_id        bigint NOT NULL REFERENCES agents(id),
  dispensary_id   text NOT NULL REFERENCES dispensaries(id),
  visited_at      timestamptz NOT NULL DEFAULT now(),
  contact_name    text,
  summary         text,
  action_items    jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos          text[] NOT NULL DEFAULT '{}',         -- asset.id refs
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visit_reports_disp_idx  ON visit_reports (dispensary_id);
CREATE INDEX IF NOT EXISTS visit_reports_agent_idx ON visit_reports (agent_id);

-- ====================================================================
-- push_subscriptions — Web Push (VAPID) endpoints, one per browser
-- ====================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              bigserial PRIMARY KEY,
  optin_id        bigint REFERENCES oglife_optins(id) ON DELETE SET NULL,
  endpoint_hash   text UNIQUE NOT NULL,                  -- sha256(endpoint)
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  subscribed_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz,
  is_active       boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS push_subs_optin_idx ON push_subscriptions (optin_id);

-- ====================================================================
-- sms_subscriptions — TCPA-compliant double-opt-in roster
-- (Alpine IQ is the source of truth; this is our mirror)
-- ====================================================================
CREATE TABLE IF NOT EXISTS sms_subscriptions (
  id                bigserial PRIMARY KEY,
  optin_id          bigint REFERENCES oglife_optins(id) ON DELETE SET NULL,
  phone_e164        text UNIQUE NOT NULL,
  alpineiq_contact_id text,
  consent_text      text NOT NULL,                       -- what we showed at opt-in
  status            text NOT NULL DEFAULT 'pending'     -- pending | confirmed | stopped
                      CHECK (status IN ('pending', 'confirmed', 'stopped')),
  single_optin_at   timestamptz NOT NULL DEFAULT now(),
  double_optin_at   timestamptz,
  stopped_at        timestamptz
);

-- ====================================================================
-- product_notification_subscribers — per-strain interest list
-- (drives "tell me when Permanent OG drops again" alerts)
-- ====================================================================
CREATE TABLE IF NOT EXISTS product_notification_subscribers (
  id              bigserial PRIMARY KEY,
  optin_id        bigint REFERENCES oglife_optins(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  product_slug    text,
  strain_slug     text,
  category        text,                                  -- 'rosin', 'flower', etc.
  subscribed_at   timestamptz NOT NULL DEFAULT now(),
  is_active       boolean NOT NULL DEFAULT true,
  UNIQUE (optin_id, channel, product_slug, strain_slug, category)
);

-- ====================================================================
-- blog_posts — mirrors the legacy /blog (Always Grinding drops, batch
-- notes). Slugs preserved from legacy URLs for SEO continuity.
-- ====================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  slug          text PRIMARY KEY,
  title         text NOT NULL,
  excerpt       text,
  body_md       text,                                   -- markdown body
  hero_asset_id text REFERENCES assets(id),
  published_at  timestamptz,
  is_published  boolean NOT NULL DEFAULT false,
  legacy_url    text,                                   -- original /blog/<slug>
  seo_title     text,
  seo_description text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts (published_at DESC);

-- ====================================================================
-- strain_updates — the "Strain Updates" feed shown on / and at
-- /strains/updates. Each row is one news item (batch drop, etc.).
-- ====================================================================
CREATE TABLE IF NOT EXISTS strain_updates (
  id            bigserial PRIMARY KEY,
  strain_slug   text REFERENCES strains(slug),
  product_slug  text,                                   -- nullable; some updates are strain-level
  headline      text NOT NULL,
  body          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN (
                  'new-drop', 'batch-update', 'coming-soon', 'limited'
                )),
  hero_asset_id text REFERENCES assets(id),
  published_at  timestamptz NOT NULL DEFAULT now(),
  is_published  boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS strain_updates_published_at_idx ON strain_updates (published_at DESC);
CREATE INDEX IF NOT EXISTS strain_updates_strain_idx       ON strain_updates (strain_slug);

-- ====================================================================
-- merch_items — apparel + tech decks (Always Grinding line).
-- Bridge to a proper store backend (Shopify/BigCommerce/Square) is TBD;
-- this table is enough to drive the brochure /store page.
-- ====================================================================
CREATE TABLE IF NOT EXISTS merch_items (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  line          text NOT NULL,                          -- 'Apparel', 'Tech Decks', etc.
  description   text,
  price_cents   integer NOT NULL,
  status        text NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'low-stock', 'limited', 'sold-out')),
  hero_asset_id text REFERENCES assets(id),
  external_url  text,                                   -- Shopify/BigCommerce product URL when wired
  display_order integer NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- audit_log — admin actions on the dashboard
-- ====================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  actor       text NOT NULL,                           -- 'brendon', 'randy', 'system'
  action      text NOT NULL,
  target_kind text,                                    -- 'asset', 'product', 'batch', ...
  target_id   text,
  payload     jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

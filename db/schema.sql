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
-- qr_tokens — what's printed on the jar (one per jar OR one per batch?)
-- Decision: ONE PER BATCH for now (simpler, all jars in a batch share).
-- Easy to migrate to one-per-jar later by adding `jar_serial` column.
-- ====================================================================
CREATE TABLE IF NOT EXISTS qr_tokens (
  token         text PRIMARY KEY,                       -- 12-char nanoid, URL-safe
  batch_id      bigint NOT NULL REFERENCES batches(id),
  printed_at    timestamptz NOT NULL DEFAULT now(),
  is_active     boolean NOT NULL DEFAULT true,
  retired_at    timestamptz
);
CREATE INDEX IF NOT EXISTS qr_tokens_batch_idx ON qr_tokens (batch_id);

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

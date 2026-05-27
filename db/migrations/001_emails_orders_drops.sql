-- Migration 001 — emails_outbound + order_status_seen + current_drops
--
-- Apply against the BMF schema on Neon AFTER the initial db/schema.sql run.
-- Idempotent (CREATE TABLE IF NOT EXISTS); safe to re-run.
--
-- Run from openclaw:
--   psql "$DATABASE_URL_UNPOOLED" -f db/migrations/001_emails_orders_drops.sql

-- ---------------- emails_outbound ----------------

CREATE TABLE IF NOT EXISTS emails_outbound (
  id                 bigserial PRIMARY KEY,
  template           text NOT NULL,
  recipient          text NOT NULL,
  recipient_optin_id bigint REFERENCES oglife_optins(id) ON DELETE SET NULL,
  subject            text NOT NULL,
  vars               jsonb NOT NULL DEFAULT '{}'::jsonb,
  ses_message_id     text,
  status             text NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued', 'sent', 'failed', 'bounced', 'complained')),
  error              text,
  queued_at          timestamptz NOT NULL DEFAULT now(),
  sent_at            timestamptz,
  related_kind       text,
  related_id         text
);
CREATE INDEX IF NOT EXISTS emails_outbound_recipient_idx ON emails_outbound (recipient);
CREATE INDEX IF NOT EXISTS emails_outbound_status_idx    ON emails_outbound (status);
CREATE INDEX IF NOT EXISTS emails_outbound_template_idx  ON emails_outbound (template);
CREATE INDEX IF NOT EXISTS emails_outbound_queued_idx    ON emails_outbound (queued_at DESC);

-- ---------------- order_status_seen ----------------

CREATE TABLE IF NOT EXISTS order_status_seen (
  nabis_order_id  text PRIMARY KEY,
  order_number    text,
  last_status     text NOT NULL,
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  buyer_email     text,
  buyer_name      text,
  carrier         text,
  tracking_number text,
  tracking_url    text
);
CREATE INDEX IF NOT EXISTS order_status_seen_status_idx ON order_status_seen (last_status);

-- ---------------- current_drops ----------------
--
-- A live row per "X strain available at Y dispensary right now". Sourced
-- from manual admin adds + the IG hashtag-mention ingester. Drives the
-- /drops page and the homepage "where to find" section.

CREATE TABLE IF NOT EXISTS current_drops (
  id              bigserial PRIMARY KEY,
  strain_slug     text REFERENCES strains(slug) ON DELETE SET NULL,
  product_slug    text,                                   -- nullable; usually matches strain
  dispensary_id   text REFERENCES dispensaries(id) ON DELETE SET NULL,
  dispensary_name text,                                   -- fallback when no FK
  city            text,
  state           text,
  status          text NOT NULL DEFAULT 'live'
                    CHECK (status IN ('live', 'low-stock', 'sold-out', 'incoming')),
  source_kind     text NOT NULL DEFAULT 'manual'
                    CHECK (source_kind IN ('manual', 'instagram', 'weedmaps', 'leafly', 'nabis')),
  source_url      text,                                   -- e.g. instagram post permalink
  source_handle   text,                                   -- @dispensary
  hero_image_url  text,                                   -- self-hosted blob URL
  caption         text,
  drop_date       date,
  added_at        timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz                             -- e.g. drop_date + 14 days
);
CREATE INDEX IF NOT EXISTS current_drops_strain_idx     ON current_drops (strain_slug);
CREATE INDEX IF NOT EXISTS current_drops_added_idx      ON current_drops (added_at DESC);
CREATE INDEX IF NOT EXISTS current_drops_dispensary_idx ON current_drops (dispensary_id);

-- ---------------- product images ----------------
--
-- Adds the per-merch-item image slot we display in the store. Backwards-compat:
-- existing rows have NULL image_url and fall back to the placeholder component.

ALTER TABLE merch_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE merch_items ADD COLUMN IF NOT EXISTS image_blob_id text;
ALTER TABLE merch_items ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ---------------- strain hero images ----------------
--
-- Optional hero asset reference per strain. Replaces the placeholder card
-- on the homepage + /strains pages when present.

ALTER TABLE strains ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS hero_blob_id text;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb;

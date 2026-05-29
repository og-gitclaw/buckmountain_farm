-- ====================================================================
-- 002_menu_listings — Weedmaps/Leafly menu-placement audit results.
--
-- Populated by scripts/audit-menu-placement.mjs (runs on openclaw, posts
-- to /api/agent/menu-placement). One row per (dispensary, platform):
-- whether Buck Mountain SKUs were found on that store's online menu, how
-- many, and when last checked. /agent/menu-placement reads this to turn
-- the "missing link" flags into verified listed/not-listed state.
-- ====================================================================
CREATE TABLE IF NOT EXISTS menu_listings (
  id             bigserial PRIMARY KEY,
  dispensary_id  text NOT NULL REFERENCES dispensaries(id) ON DELETE CASCADE,
  platform       text NOT NULL CHECK (platform IN ('weedmaps', 'leafly', 'house')),
  menu_url       text,
  listed         boolean NOT NULL DEFAULT false,   -- Buck Mountain found on the menu?
  match_count    integer NOT NULL DEFAULT 0,       -- # of Buck SKUs detected
  matched_names  jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at     timestamptz NOT NULL DEFAULT now(),
  error          text,                             -- non-null if the check itself failed
  UNIQUE (dispensary_id, platform)
);
CREATE INDEX IF NOT EXISTS menu_listings_dispensary_idx ON menu_listings (dispensary_id);
CREATE INDEX IF NOT EXISTS menu_listings_checked_idx    ON menu_listings (checked_at DESC);

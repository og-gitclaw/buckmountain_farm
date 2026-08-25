-- Billing retry guards (2026-08-24 incident on hbvets: six live auths in one evening).
-- Additive only; safe on a live database. Apply with:
--   psql "$DATABASE_URL_UNPOOLED" -f scripts/2026-08-24-billing-guards.sql
-- (timestamptz, not timestamp: every other timestamp on these tables is
-- timestamptz — see db/migrations/004_hosting_billing.sql.)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_decline_kind varchar(12);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS dunning_step integer NOT NULL DEFAULT 0;
ALTER TABLE billing_charges ADD COLUMN IF NOT EXISTS trigger varchar(16);

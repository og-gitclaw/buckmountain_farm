-- ====================================================================
-- 004_hosting_billing — the hosting-billing kit's four tables.
--
-- 30-day evaluation, then $25/month autopay for hosting, charged to a
-- card the client vaults at Clover from /admin/billing.
--
-- INSTALLED DORMANT. Nothing in here is written to until
-- BILLING_ENABLED is set to "1"/"true" in the environment (see
-- lib/billing/lifecycle.ts → billingEnabled()). Creating the tables
-- does not start a trial, does not seed a subscription, and does not
-- send anyone an email.
--
-- Design notes:
--   * `subscriptions` holds exactly ONE row on a client site, with a
--     fixed primary key (`sub_buckmountain_care`) so two simultaneous
--     first-page-loads can race safely — the loser's INSERT is a no-op
--     instead of a duplicate customer.
--   * `clover_source_id` is the VAULTED card id. The token the hosted
--     iframe produces is SINGLE-USE: storing it here instead would bill
--     fine in month 1 and decline every month after.
--   * `billing_charges` logs every charge ATTEMPT, not just successes —
--     it is what the client's statement is rendered from and what proves
--     we never double-charged. The UNIQUE index on `idempotency_key` is
--     the last line of defence: two sweeps racing each other both pass
--     the read-then-write ledger check, but only one can win the
--     constraint.
--   * `message_log` is the billing-specific audit trail. It is separate
--     from `emails_outbound` on purpose: emails_outbound is the SES
--     delivery log for the whole site, this is the money paper trail and
--     must stay readable even if the mail log is pruned.
--
-- Apply: psql "$DATABASE_URL_UNPOOLED" -f db/migrations/004_hosting_billing.sql
-- ====================================================================

-- ====================================================================
-- subscriptions — one row per billed site (one row, here)
-- ====================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  varchar(40) PRIMARY KEY,              -- sub_<slug>_care
  org_name            text NOT NULL,
  contact_email       varchar(320) NOT NULL,
  plan                varchar(40) NOT NULL DEFAULT 'care',
  monthly_cents       integer NOT NULL DEFAULT 2500,
  -- trial | active | past_due | pending_payment | canceled
  status              varchar(24) NOT NULL DEFAULT 'trial',
  trial_started_at    timestamptz NOT NULL DEFAULT now(),
  trial_expires_at    timestamptz NOT NULL,
  card_on_file        boolean NOT NULL DEFAULT false,
  card_brand          varchar(24),
  card_last4          varchar(4),
  card_exp            varchar(7),
  -- Clover customer id — a raw iframe token is single-use and dies at month 2.
  clover_customer_id  text,
  clover_source_id    text,
  next_charge_at      timestamptz,
  last_charge_status  text,
  canceled_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

-- ====================================================================
-- subscription_addons — optional paid extras riding the monthly invoice
-- ====================================================================
CREATE TABLE IF NOT EXISTS subscription_addons (
  id               serial PRIMARY KEY,
  subscription_id  varchar(40) NOT NULL
                     REFERENCES subscriptions (id) ON DELETE CASCADE,
  code             varchar(40) NOT NULL,
  label            text NOT NULL,
  monthly_cents    integer NOT NULL,
  active           boolean NOT NULL DEFAULT true,
  started_at       timestamptz NOT NULL DEFAULT now(),
  canceled_at      timestamptz
);

CREATE INDEX IF NOT EXISTS subscription_addons_sub_idx
  ON subscription_addons (subscription_id);

-- ====================================================================
-- billing_charges — immutable ledger of every charge ATTEMPT
-- ====================================================================
CREATE TABLE IF NOT EXISTS billing_charges (
  id               serial PRIMARY KEY,
  subscription_id  varchar(40) NOT NULL
                     REFERENCES subscriptions (id) ON DELETE CASCADE,
  clover_charge_id text,
  amount_cents     integer NOT NULL,
  -- Snapshot of what the amount was made of, so old invoices stay truthful
  -- after a price or add-on changes.
  line_items       jsonb,
  period_start     timestamptz,
  period_end       timestamptz,
  ok               boolean NOT NULL,
  reason           text,
  idempotency_key  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_charges_sub_idx
  ON billing_charges (subscription_id);

-- THE anti-double-charge backstop. Two sweeps racing each other both pass
-- the read-then-write ledger check in runCycle(); only one can win this.
CREATE UNIQUE INDEX IF NOT EXISTS billing_charges_idem_key
  ON billing_charges (idempotency_key);

-- ====================================================================
-- message_log — every billing notice we attempt, for the audit trail
-- ====================================================================
CREATE TABLE IF NOT EXISTS message_log (
  id         serial PRIMARY KEY,
  channel    varchar(8) NOT NULL,        -- email | sms
  template   varchar(48) NOT NULL,
  recipient  text NOT NULL,
  ok         boolean NOT NULL,
  error      text,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_log_sent_idx ON message_log (sent_at DESC);

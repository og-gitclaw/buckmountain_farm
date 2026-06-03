-- ====================================================================
-- 003_push_fault_injection — single-row table letting super-admins
-- inject synthetic transient failures into the next N Web Push sends.
--
-- Used to exercise lib/push.ts's sendWithRetry path end-to-end on a
-- real preview / prod deploy without contacting (and getting throttled
-- by) FCM / APNs / Mozilla autopush.
--
-- Single-row pattern (id = 1 always exists, CHECK enforces it) keeps
-- the read path a fast PK lookup. When `enabled` is false, sendToOne
-- skips the override entirely.
-- ====================================================================
CREATE TABLE IF NOT EXISTS push_fault_injection (
  id                   smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled              boolean NOT NULL DEFAULT false,
  remaining            integer NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  status_code          integer NOT NULL DEFAULT 429
                         CHECK (status_code IN (429, 500, 502, 503, 504)),
  retry_after_seconds  integer CHECK (retry_after_seconds IS NULL OR retry_after_seconds >= 0),
  updated_by           text,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO push_fault_injection (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

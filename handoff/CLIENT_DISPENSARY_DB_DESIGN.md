# Lightweight Client + Dispensary DB — Design Note

**Per Brendon directive 2026-05-24:** "Come up with a post-Grass [PostgreSQL?]
database, lightweight + open-source, that can keep track of all the clients
and dispensaries."

This doc captures the design we landed on so the home-machine team can
provision + seed without re-derivation.

## TL;DR

- **Engine:** Postgres 16 on Neon (serverless, branches per env, free tier
  covers the entire BMC + Buck portfolio for v1).
- **Open-source-only:** Postgres itself is OSS; Neon is the managed hosting
  (the engine and tooling are OSS — `pg_dump`/`pg_restore` give us escape
  velocity any day we want it). If you object to managed-DB lock-in, a
  one-command migration moves us to Supabase, Crunchy Bridge, or a Hetzner
  VM running plain Postgres.
- **Schema:** already in `db/schema.sql`. The dispensary-tracking surface
  lives in 4 tables (covered below); the rest of the schema handles assets,
  QR, loyalty, etc.
- **No separate "CRM" product needed.** The agent portal at `/agent/*`
  IS the CRM — it's just a small Next.js app on top of Postgres.

## Tables that cover client + dispensary tracking

```
dispensaries
  id (slug)              text PK
  name                   text
  legal_name             text
  license_number         text UNIQUE      -- CDPH/DCC
  state, city, address
  lat, lng               for the future map view
  buyer_name             text
  buyer_email, buyer_phone
  weedmaps_url, leafly_url, menu_url
  status                 lead | active | lapsed | dropped
  last_order_at          timestamptz
  notes                  text
  created_at, updated_at

agents
  id                     bigserial PK
  google_sub             text UNIQUE      -- OAuth sub from Google SSO
  email                  text
  display_name           text
  role                   rep | manager | admin
  is_active              boolean
  created_at, last_login_at

agent_dispensary_assignments
  agent_id               -> agents
  dispensary_id          -> dispensaries
  is_primary             boolean          -- "this is the lead agent"
  assigned_at            timestamptz
  PRIMARY KEY (agent_id, dispensary_id)

visit_reports
  id                     bigserial PK
  agent_id               -> agents
  dispensary_id          -> dispensaries
  visited_at             timestamptz
  contact_name           text
  summary                text
  action_items           jsonb (array of strings)
  photos                 text[] of assets.id refs
  created_at
```

That's it. Four tables. Adding a dispensary = one INSERT. Assigning an
agent = one INSERT. Logging a visit = one INSERT plus a SELECT for the
detail page. No event-sourcing, no separate CRM platform, no double-bookkeeping.

## What we explicitly did NOT model (and why)

- **Pipeline stages with kanban-style transitions** — `status` enum is
  enough. If we ever need a richer workflow we add a `dispensary_status_history`
  table and never schema-migrate the live `dispensaries.status` field.
- **Email/SMS thread storage** — Alpine IQ owns the messaging history.
  We mirror only the consent + opt-out events into `sms_subscriptions`.
- **Deal/Opportunity entities** — Nabis is the source of truth for
  orders + invoices. The agent dashboard reads from `nabis_sync` cache,
  not a separate "deals" table.
- **Custom fields per dispensary** — `notes` text is enough for v1. If we
  ever need typed custom fields, add a `dispensary_attrs (dispensary_id,
  key, value jsonb)` table later.

## Read paths the agent portal hits

| Page | Query |
|---|---|
| `/agent/dispensaries` | `SELECT d.* FROM dispensaries d JOIN agent_dispensary_assignments a ON a.dispensary_id = d.id WHERE a.agent_id = $session ORDER BY d.last_order_at DESC NULLS LAST` |
| `/agent/dispensaries/[id]` | one row from `dispensaries`, plus the 5 most recent `visit_reports`, plus the latest Nabis orders for the buyer from `nabis_sync` (resource='orders' filtered by buyer.id) |
| `/agent/orders` | recent rows from `nabis_sync` resource='orders', joined back to `dispensaries` by buyer name/license fuzzy match |
| `/agent/loyalty` | `qr_scans` joined to `qr_tokens` joined to `batches` joined to `products`, geo-filtered to assigned dispensaries |

All under 50ms even at 10k dispensaries on Neon's smallest tier.

## Write paths

| Action | Statement |
|---|---|
| File visit | `INSERT INTO visit_reports ...` + `UPDATE dispensaries SET updated_at = now()` |
| Assign agent | `INSERT INTO agent_dispensary_assignments ...` |
| New dispensary | `INSERT INTO dispensaries (...) VALUES (...)` |
| Mark lapsed | `UPDATE dispensaries SET status = 'lapsed' WHERE last_order_at < now() - interval '60 days'` (run nightly) |

## Seeding strategy

1. Export a CSV from Nabis: every account we've ever shipped to.
2. Dedupe by `license_number` (cleanest natural key).
3. `COPY dispensaries FROM '/tmp/dispensaries.csv' CSV HEADER`.
4. Brendon + Randy each get an `agents` row (manager role).
5. Field reps onboard as they Google-sign-in for the first time — the
   callback inserts an agents row with role='rep' by default.

## Backup posture

- Neon does point-in-time recovery for 7 days on free tier.
- Daily `pg_dump` to S3 via a tiny GitHub Action (P3 — write the workflow
  when we provision).
- Quarterly: tarball + cold-store on the home machine. CSV exports of
  dispensaries + agents specifically so if Neon ever evaporates we can
  reconstitute from CSVs in an hour.

## Why "post-Grass" is the right framing

Grass.io is dispensary-CRM SaaS. Buck Mountain's volume + Brendon's
existing infra (openclaw, Tailscale, the OG Life consent network) means a
SaaS CRM would be:

- Another monthly bill
- Another silo for customer data (privacy + consent re-mapping)
- Another auth wall (Buck Mountain agents would need yet another login)
- Vendor lock for an entity-graph (Dispensaries, Agents, Visits) that
  we already model perfectly in 4 tables

Owning the schema means: own the export, own the audit trail, own the
custom queries (e.g. "show me dispensaries within 50mi of the new
Permanent OG batch's warehouse"). That's free in Postgres, not possible
in most CRMs.

## What "open source" means here

| Layer | Software | License |
|---|---|---|
| Engine | Postgres | PostgreSQL License (BSD-style) |
| Driver | `pg` (node-postgres) | MIT |
| Migrations | bare `.sql` files in `db/` | n/a |
| Admin GUI (local) | `psql`, TablePlus / DBeaver | mixed |
| Hosting | Neon (managed Postgres) | OSS engine, proprietary control plane |

If "no managed control plane at all" is a hard requirement: run Postgres
in a Hetzner container ($5/mo), point our `DATABASE_URL` at it, change
nothing else. The schema is portable by design.

# Alpine IQ Integration — buckmountain.farm

**Per Brendon directive 2026-05-24:** marketing SMS / push / drip goes
through Alpine IQ. AWS SES stays **transactional-only** (receipts,
password resets, COA emails). Piggyback the existing OG Life Alpine IQ
org configuration since "it is similar enough."

## Why Alpine IQ specifically

- Cannabis-friendly (most generic SMS providers aren't)
- Built-in STOP/HELP automation per TCPA
- Audience builder + drip flows out of the box
- Already paid-for + configured for OG Life — adding Buck Mountain is a
  tag / sub-audience, not a new contract

## What's wired today (2026-05-24)

- `lib/alpineiq.ts` — thin REST client (`upsertContact`, `sendSms`,
  `broadcastNewProduct`)
- `POST /api/sms/subscribe` — single-opt-in form endpoint that triggers
  Alpine IQ's double-opt-in welcome SMS
- `POST /api/notifications/new-product` — agent / cron trigger to blast
  a new-drop announcement to the audience
- Fail-open behavior: if `ALPINEIQ_API_KEY` isn't set, endpoints return
  `{ skipped: true, reason: "alpineiq-not-configured" }` instead of 500

## What you (Brendon) need to do from the home machine

1. Log into the OG Life Alpine IQ tenant
   (the same one that handles oglife.app marketing).
2. Create a **sub-audience** for Buck Mountain:
   - Name: `buckmountain-customers`
   - Tags required: `buckmountain`, `21+`
   - Region: California
3. Note the audience ID — set in Vercel env as
   `ALPINEIQ_DEFAULT_AUDIENCE_ID`.
4. Generate an API key scoped to this audience.
   - In Alpine IQ admin → Integrations → API → New Key
   - Name: `buckmountain-farm-prod`
   - Set in Vercel env as `ALPINEIQ_API_KEY`.
5. Set `ALPINEIQ_UID` = the OG Life tenant UID (visible in admin URL).
6. (Optional) Set `ALPINEIQ_API_BASE_URL` if Alpine IQ has moved off
   `lab.alpineiq.com`. Default in code is `https://lab.alpineiq.com/api/v1.1`.

## How transactional + marketing stay separated

| Channel | Provider | Triggers |
|---|---|---|
| Email transactional | AWS SES (postal@oglife / mail.oglife.app) | Order confirms, COA delivery, password reset |
| Email marketing | Alpine IQ → email integration | Newsletter, new-drop alerts |
| SMS marketing | Alpine IQ direct | New-drop alerts, prize drawings |
| SMS transactional | Alpine IQ (templated `transactional` flag) | Order shipped, scan confirmation |
| Web Push | Native VAPID via `/api/push/subscribe` | New-drop alerts, prize wins |

**Rule:** anything with a marketing message body goes through Alpine IQ.
Anything that's purely receipt / status / 2FA goes through SES (email) or
Alpine IQ's transactional bucket (SMS) so it bypasses the marketing
campaign throttle.

## TCPA compliance posture

- Every SMS opt-in form must show the exact consent text we send to
  Alpine IQ as `consent_text` in `POST /api/sms/subscribe`.
- Alpine IQ handles double-opt-in confirmation server-side via the
  reply-Y welcome message.
- Frequency cap: max 4 msgs/month per user (set in Alpine IQ audience
  rules, not enforced in our code).
- STOP / HELP automation: handled by Alpine IQ. We do not need to write
  keyword routing.

## Webhook / inbound (P4)

When Alpine IQ supports webhooks for delivery + opt-out events, wire
`POST /api/alpineiq/webhook` to update `sms_subscriptions.status`
(`stopped` on STOP, `confirmed` on reply-Y).

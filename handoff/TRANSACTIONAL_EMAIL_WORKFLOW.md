# Transactional Email Workflow — buckmountain.farm

Single source of truth for every transactional touchpoint in the customer
lifecycle. This doc covers Buck Mountain specifically; the same `lib/email/`
infrastructure ports to any of the other business models (BMH, OG Life,
cbd.restaurant, etc.) — drop the templates folder + the schema rows into
the new repo and you have the same coverage in an afternoon.

## Channel posture (locked, per Brendon directive)

| Channel | Provider | What goes there |
|---|---|---|
| **Transactional email** | **AWS SES** | Receipts, account events, scan claims, order lifecycle, agent reports, admin alerts |
| Marketing email | Alpine IQ | Newsletter, drip, prize-drawing roll-ups |
| Marketing SMS | Alpine IQ | New drops, prize alerts |
| Transactional SMS | Alpine IQ (transactional flag) | Order shipped (when wired); double-opt-in confirm |
| Web Push | Native VAPID | Drop alerts, prize wins |

SES never touches marketing copy. If you find yourself writing "this month's
top picks" via `sendTransactional`, you've routed it wrong — flip it to
Alpine IQ.

## Full lifecycle (Buck Mountain)

```
T-0   Visitor hits buckmountain.farm
      └─ no email (we don't know who they are)

      User clicks "Sign in with Google"
      └─ Google OAuth completes
      └─ /api/auth/google/callback inserts oglife_optins (xmax=0 = first)
      └─ FIRST SIGN-IN → sendTransactional('welcome')
      └─ redirect → /auth/consent

      User confirms preferences on /auth/consent
      └─ /api/auth/consent writes consents jsonb
      └─ sendTransactional('consent-confirmed') summarizing opt-ins

T+0   User scans QR sticker under jar lid
      └─ /loyalty/scan/[token] → /api/loyalty/scan/[token]
      └─ If counterfeit: sendToAdmin('counterfeit-alert')
      └─ Else: scan recorded in qr_scans

      User taps "Claim points" → SSO → /loyalty/claim/[token]
      └─ /api/loyalty/claim/[token] transactional:
          - upsert oglife_optins
          - link scan to optin
          - INSERT rewards_ledger (+10)
      └─ sendTransactional('scan-points-credited')

      User subscribes to a strain at /strains/updates
      └─ /api/notifications/subscribe
      └─ sendTransactional('subscription-confirmed') if session

      Admin posts new drop at /admin/strain-updates
      └─ /api/admin/strain-updates:
          - INSERT strain_updates
          - Alpine IQ broadcastNewProduct() — SMS audience
          - lib/push.broadcast() — Web Push
          - For every active product_notification_subscribers row:
            sendTransactional('strain-drop') — per-user, real unsubs

      Customer places order (Nabis side)
      └─ /api/cron/nabis-sync runs hourly:
          - pulls /orders since 14d
          - diffs each order's status against order_status_seen
          - on transition fires the right template:
              placed     → 'order-placed'
              shipped    → 'order-shipped'
              delivered  → 'order-delivered'
              canceled   → 'order-canceled'

T+3d  After delivered, same cron fires 'review-request'
      └─ guarded by emails_outbound.related_kind='review-request' check
         so we never double-send

ASIDE (agents):
      Agent files visit at /agent/visit-report
      └─ /api/agent/visit-report writes visit_reports + bumps dispensary
      └─ sendTransactional('visit-report-filed') to agent
         (bccAdmin: true → also to MAIL_ADMIN_BCC)

      Agent allocates QR sheet at /agent/qr/request
      └─ /api/agent/qr/request inserts qr_sheets + bulk qr_tokens
      └─ For every email in PHOTOSHOP_TEAM_RECIPIENTS:
         sendTransactional('qr-sheet-allocated') with the token list
         + the Tailscale pickup path

      Openclaw watcher ingests the rendered sheet
      └─ POST /api/admin/qr-sheets
      └─ sendToAdmin('qr-sheet-ingested') confirmation

ASIDE (admin alerts):
      Any integration goes red on /api/health
      └─ (future cron) sendToAdmin('health-alert')

ASIDE (monthly prize drop):
      Admin runs the drawing manually (P4: cron)
      └─ sendTransactional('prize-winner') to the winner
```

## Code architecture

```
lib/email/
  index.ts          → sendTransactional(), sendToAdmin()
  ses.ts            → AWS SES v2 client wrapper, fail-open
  render.ts         → shared HTML+text shell, brand tokens
  templates.ts      → all per-touchpoint templates (subject/html/text)

db/schema.sql
  emails_outbound   → every send logged (auditable, status-tracked)
  order_status_seen → cron diff cursor

app/api/
  email/test        → admin smoke-test send
  cron/nabis-sync   → hourly poller, fires lifecycle emails
  alpineiq/webhook  → STOP/HELP/CONFIRM mirror to sms_subscriptions

app/admin/emails    → outbound log viewer + test-send form
```

## Adding a new template

1. Add the key to `TemplateName` in `lib/email/templates.ts`.
2. Add the payload type to `TemplatePayload`.
3. Add the render function to `TEMPLATES`.
4. Call `sendTransactional({ template: 'your-key', to, vars })` from
   wherever the trigger lives.

That's it — `emails_outbound` log + retries + admin BCC + audit trail are
all handled by the shared path.

## Adding a new channel (later)

When AWS SNS or Twilio comes online, add a sibling driver next to
`ses.ts`:

```
lib/email/  → renamed lib/messaging/
  drivers/
    ses.ts
    sns.ts
    twilio.ts
    alpineiq.ts
```

Add a `channel: 'email' | 'sms' | 'push'` field to each template payload,
and route through the right driver inside `sendTransactional`. The
`emails_outbound` table grows a `channel` column at the same time. No
caller code changes.

## Multi-business-model reuse

Per Brendon: "every single one needs order fulfillment in some fashion."
This stack ports to BMH, OG Life, cbd.restaurant, etc. with three changes:

1. Brand tokens in `lib/email/render.ts` — `DEFAULT_BRAND` const + colors
2. Per-brand `MAIL_FROM_TRANSACTIONAL` env var
3. Templates — most carry over verbatim; brand-specific copy (greeting,
   prize-drawing rules, etc.) lives in the template file and gets a
   per-brand variant if needed

For BMH specifically (Wix-fronted), the order-lifecycle templates fire from
the Wix webhook hitting our `/api/orders/wix-webhook` endpoint instead of
the Nabis poller. The template + send path are identical.

For cbd.restaurant (BigCommerce), use the BigCommerce webhook pattern
(`/api/orders/bc-webhook`). Same templates, different upstream.

## Required env (Vercel project)

| Var | Purpose | Required? |
|---|---|---|
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | SES auth | yes — without these, every send returns `skipped: ses-not-configured` |
| `AWS_SES_REGION` (or `AWS_REGION`) | SES endpoint region | yes |
| `MAIL_FROM_TRANSACTIONAL` | From header | yes (must be SES-verified) |
| `MAIL_REPLY_TO` | Reply-To header | yes |
| `MAIL_ADMIN_RECIPIENTS` | Comma-list for admin templates | yes |
| `MAIL_ADMIN_BCC` | BCC on agent-side sends | optional |
| `SES_CONFIGURATION_SET` | Bounce/complaint routing config | optional |
| `PHOTOSHOP_TEAM_RECIPIENTS` | Comma-list for QR allocation emails | yes |
| `PHOTOSHOP_SYNC_PATH` | Pickup path shown in QR allocation email | optional |
| `CRON_SECRET` | Bearer token Vercel sends to cron endpoints | yes |

## SES configuration checklist (one-time, AWS console)

1. Verify the sending domain `buckmountain.farm` (DNS records on GoDaddy).
2. Verify any "From" addresses you want to use (`no-reply@buckmountain.farm`,
   `support@buckmountain.farm`).
3. **Get out of sandbox.** Default SES accounts can only send to verified
   addresses + are rate-limited. Request production access from the SES
   console → 24-hr turnaround typical.
4. (Optional) Configure a SES Configuration Set with an SNS topic on
   bounce + complaint → wire that SNS topic at `/api/ses/webhook` later
   to auto-update `emails_outbound.status` to `bounced`/`complained`.
5. Set the env vars above on Vercel (Production + Preview both).

## Test plan after wiring

```
# 1. Smoke test SES from /admin/emails
#    Drop your email into the form, hit Send Test, confirm landed.

# 2. Trigger welcome
curl -i -L https://buckmountain.farm/api/auth/google?return_to=/
# → complete OAuth → check inbox

# 3. Trigger scan-credit
#    a. Allocate tokens: visit /agent/qr/request, request 10
#    b. Take one token from the email Photoshop got
#    c. Visit /loyalty/scan/<token>
#    d. Click Claim → SSO → /loyalty/claim/<token>
#    e. Check inbox for +10 points email

# 4. Trigger strain-drop
#    a. Subscribe via /strains/updates (channel=email)
#    b. /admin/strain-updates with also_blast=on
#    c. Check inbox

# 5. Verify the log
#    Visit /admin/emails → every send should be there with status=sent
```

## Bounce / complaint handling (P4)

`emails_outbound.status` currently flips between `queued`, `sent`,
`failed`. After we wire SES → SNS → `/api/ses/webhook`, the status
extends to `bounced` and `complained`. The webhook handler does:

```sql
UPDATE emails_outbound
   SET status = 'bounced'
 WHERE ses_message_id = $1;
UPDATE oglife_optins
   SET consents = consents || '{"marketing_email": false}'::jsonb
 WHERE email = $2;  -- hard bounce kills marketing opt-in
```

Until that's wired, monitor bounces in the AWS console weekly.

## Why no React Email / MJML

Template literals + a shared shell render correctly in 100% of clients we
care about (Gmail web, iOS Mail, macOS Mail, Outlook 365). React Email +
MJML add a build step + 2-3MB of deps for marginal gain. If/when we want
drag-and-drop template editing, we add MJML at that point. Until then,
copy is a TypeScript file, type-checked, diffable.

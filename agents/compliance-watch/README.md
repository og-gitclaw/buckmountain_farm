# compliance-watch

The autonomous compliance + operations agent that runs on **openclaw**
24/7. Owns the 4th dimension of the rebuild (Beat 13 on `/before-after`):
keeps the brand current with TCPA / CCPA / California DCC rule changes,
handles routine ops the site can't do for itself, and escalates to admin
via SES when it can't resolve something.

## What it watches

| Source | Detects | Action |
|---|---|---|
| TCPA · FCC bulletins | SMS disclosure language changes, double-opt-in mechanics | Re-renders Alpine IQ welcome template; updates `/api/sms/subscribe` `consent_text` validation; alerts admin |
| CCPA / CPRA | Opt-out mechanism additions, "Do Not Sell" UI requirements | Adds new field to `consents jsonb` schema; regenerates `/privacy` body; adds opt-out flag to `/auth/consent` |
| California DCC / BCC | Cannabis ad-targeting rules, 21+ verification standards, COA requirements | Updates AgeGate localStorage TTL; adjusts `/coa` lookup validation; alerts admin on bulletins |
| Alpine IQ config | Audience-tag drift, webhook secret rotation needs | Re-syncs audience definitions; rotates webhook secret via Vercel API; validates STOP/HELP coverage |
| SES reputation | Bounce rate > 5%, complaint rate > 0.1%, sandbox status | Auto-pauses marketing template fan-out; flips `marketing_email: false` on hard bounces; alerts admin |
| Neon schema drift | Deployed schema vs `db/schema.sql` mismatch | Diffs; alerts on unexpected drift |
| IG mentions | New `#buckmountaincannabis` posts | Posts to `/api/admin/drops` (this is also already scripted at `scripts/ingest-ig-mentions.mjs`; the agent runs it on schedule) |
| Push subscriptions | Dead endpoints (404/410) | Already auto-retired inside `lib/push.broadcast()`; agent monitors retire rate as a signal |

## Architecture

```
agents/compliance-watch/
├── README.md                ← this file
├── watch.py                 ← main loop (poll → diff → act → log)
├── rules/
│   ├── tcpa.yaml            ← TCPA invariants + change-detection config
│   ├── ccpa.yaml            ← CCPA / CPRA
│   ├── ca_dcc.yaml          ← California cannabis ad rules
│   ├── alpine_iq.yaml       ← audience config invariants
│   └── ses_reputation.yaml  ← bounce/complaint thresholds
├── actions/
│   ├── consent_update.py    ← applies consent schema changes via /api/admin/consent-migration
│   ├── render_legal.py      ← regenerates /privacy + /terms bodies
│   ├── admin_alert.py       ← posts via SES health-alert template
│   └── audit_log.py         ← appends to audit_log table for every action
├── state/
│   └── .gitignore           ← keeps last-known-state JSON out of git
├── launchd/
│   └── com.buckmountain.compliance-watch.plist
└── cron/
    └── hourly.sh            ← entry point for the launchd job
```

## Why an agent (not a cron)

A cron just polls. The agent:

1. **Polls** regulatory + integration sources on configurable cadences
2. **Diffs** new state against last-known
3. **Decides** which action(s) the change requires (rules tree)
4. **Applies** atomically where it can, via the site's existing admin APIs
5. **Escalates** to admin via SES when the change is ambiguous or destructive
6. **Logs** every decision + action with regulatory citation

All actions are reversible — every write is preceded by an `audit_log` row
capturing the prior state. Admin can roll back any agent decision by
posting `/api/admin/agent-rollback` with the audit_log id.

## Setup on openclaw

```bash
# Clone the repo to openclaw if not already there
cd ~ && git clone https://github.com/og-gitclaw/buckmountain_farm.git
cd ~/buckmountain_farm

# Install the agent dependencies
cd agents/compliance-watch
pip install -r requirements.txt   # stdlib + pyyaml + requests

# Env (in ~/.openclaw_secrets.d/ per the openclaw secrets convention)
cat > ~/.openclaw_secrets.d/compliance_watch.env <<EOF
BUCKMOUNTAIN_BASE=https://buckmountain.farm
ADMIN_API_TOKEN=<from Vercel env>
ALPINEIQ_API_KEY=<from Vercel env>
ALPINEIQ_UID=4381
SES_HEALTH_RECIPIENT=mustwemuse@gmail.com
COMPLIANCE_STATE_DIR=/Volumes/OpenClaw-SSD/cache/compliance-watch
EOF
chmod 600 ~/.openclaw_secrets.d/compliance_watch.env

# Install the launchd job
cp launchd/com.buckmountain.compliance-watch.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.buckmountain.compliance-watch.plist

# Verify it's running
launchctl list | grep buckmountain.compliance
tail -f ~/Library/Logs/buckmountain-compliance-watch.log
```

## Cadences

| Task | Schedule |
|---|---|
| Regulatory feed poll (TCPA, CCPA, DCC) | every 6h |
| Alpine IQ config invariant check | hourly |
| SES reputation pull | hourly |
| Push retire rate audit | every 12h |
| Schema drift check | nightly |
| Audit log retention sweep (90d) | weekly |

## Manual run (smoke test)

```bash
cd ~/buckmountain_farm/agents/compliance-watch
source ~/.openclaw_secrets.d/compliance_watch.env
python3 watch.py --once --dry-run
```

`--dry-run` does everything except apply changes — useful for testing
new rules.

## Adding a new rule

1. Drop a YAML file under `rules/` with:
   ```yaml
   id: my-new-rule
   source: <regulatory body or integration name>
   poll_cadence: 6h
   detect:
     type: rss | http_diff | api_field
     url: ...
     field: ...
   actions:
     - kind: consent_update | render_legal | admin_alert
       params: ...
   ```
2. Test with `--dry-run`
3. Commit + push; openclaw pulls on next nightly sweep

## Relation to the rest of the build

- Site repo: this directory
- Site routes that the agent calls: `/api/admin/*` (auth: `ADMIN_API_TOKEN`)
- Site routes the agent updates: `/privacy`, `/terms`, `/auth/consent`
  (via re-rendered template bodies stored in `data/legal/`)
- Site DB tables the agent writes: `audit_log`, `oglife_optins.consents`,
  `sms_subscriptions.status`, `emails_outbound`
- Site DB tables the agent reads: `emails_outbound` (bounce monitoring),
  `push_subscriptions` (retire rate)

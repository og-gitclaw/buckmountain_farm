# Instagram Mention Ingestion — buckmountain.farm

Auto-populates `/drops` with dispensary posts that tag Buck Mountain.
Runs on openclaw via cron.

## What it does

`scripts/ingest-ig-mentions.mjs` queries the Meta Graph API for recent
posts tagged with our hashtags (`#buckmountaincannabis`, strain-specific
tags, etc.), extracts the strain referenced in the caption, and inserts a
`current_drops` row attributing the post to the dispensary that made it.

End result: when someone in Oakland posts "fresh @somebodydispo just got
in the new Strawberry Lobster #buckmountaincannabis", that post shows up
on /drops within ~15 minutes (hourly cron + a couple minutes to ingest).

## Setup (one-time, on the Meta side)

1. **Connect Buck Mountain IG to Facebook Business Suite**
   - business.facebook.com → Business Settings → Accounts → Instagram Accounts
   - Link `@buckmountaincannabis`

2. **Create a Meta app**
   - developers.facebook.com → My Apps → Create App
   - Use case: "Other" → Type: "Business"
   - App name: `BuckMountain IG Ingester`

3. **Request permissions**
   - App Review → Permissions → request:
     - `instagram_basic`
     - `pages_show_list`
     - `pages_read_engagement`
     - `instagram_manage_insights` (needed for hashtag search)
   - Approval usually < 48hr for simple read use cases.

4. **Generate a long-lived (60-day) Page access token**
   - Graph API Explorer (developers.facebook.com/tools/explorer)
   - Get a User Token first → exchange for Page Token via
     `GET /me/accounts` → pick the page → exchange Page Token for long-lived
     via `GET /oauth/access_token?grant_type=fb_exchange_token&...`
   - Save as `IG_ACCESS_TOKEN`.

5. **Resolve IG_USER_ID**
   - `GET /me/accounts?access_token=$IG_ACCESS_TOKEN` → find the page
   - `GET /<page_id>?fields=instagram_business_account&access_token=$IG_ACCESS_TOKEN`
   - Save the `instagram_business_account.id` as `IG_USER_ID`.

## Setup (one-time, on openclaw)

1. Add env vars to `~/.zshrc` (or wherever you keep secrets):
   ```bash
   export IG_ACCESS_TOKEN='...'
   export IG_USER_ID='...'
   export ADMIN_API_TOKEN='...'  # same one in Vercel env
   export BUCKMOUNTAIN_BASE='https://buckmountain.farm'  # or buckmountain-farm-git-...vercel.app for preview
   ```

2. Test it once:
   ```bash
   cd ~/buckmountain_farm
   node scripts/ingest-ig-mentions.mjs
   ```
   Expect output like:
   ```
   [ig-ingest] done: {"tags":9,"posts":48,"matched":7,"posted":7,"skipped":41}
   ```

3. Schedule via launchd or cron — hourly is sensible:
   ```cron
   0 * * * *  cd /Users/iamclaw/buckmountain_farm && /usr/bin/env IG_ACCESS_TOKEN=... IG_USER_ID=... ADMIN_API_TOKEN=... BUCKMOUNTAIN_BASE=https://buckmountain.farm node scripts/ingest-ig-mentions.mjs >> ~/Library/Logs/buckmountain-ig-ingest.log 2>&1
   ```

## Hashtags monitored

Hardcoded in `scripts/ingest-ig-mentions.mjs` (`HASHTAGS` array). Extend
as new strain-specific tags emerge:

- `#buckmountaincannabis`, `#buckmountain`, `#buckmtncannabis`, `#buckmtn`
- Strain hashtags: `#permanentog`, `#cheetahpiss`, `#strawberrylobster`,
  `#grapelobster`, etc.

## Strain matching

A regex map in the script (`STRAIN_KEYWORD_MAP`) maps caption text to our
catalog slugs. Add entries when new strains land in `data/strains.ts`.

If a post doesn't match any strain regex it's skipped (rather than guessed
at). That keeps `/drops` clean — only confident matches show up.

## Token rotation

Long-lived tokens expire after 60 days. Set a calendar reminder for day
50 to:
1. Refresh via Graph API Explorer
2. Update `IG_ACCESS_TOKEN` env in openclaw + Vercel

Future: `/api/cron/refresh-ig-token` that auto-rotates 5 days before
expiry using the refresh endpoint. Add when this becomes annoying.

## What happens server-side

`/api/admin/drops` (POST) is what the script hits. It:
1. Validates the payload (status, source_kind, etc.)
2. Inserts a `current_drops` row
3. Returns a redirect to /drops?added=1 (the script ignores the redirect
   — it only cares about the 2xx/3xx status code)

The row is idempotent-by-source-url at the application layer (the script
shouldn't re-insert the same Instagram post on repeated runs because the
Graph API returns the same set; we de-dupe by checking `source_url` in
a SELECT before insert — TODO when the volume warrants it; right now
the IG cron runs hourly and we re-insert at most ~30 posts/run which is
trivial).

## Privacy

We only fetch PUBLIC posts tagged with our hashtags. No DMs, no follower
lists, no scraping of private accounts. Caption text is stored verbatim
in `current_drops.caption` so the original poster's words show up cited;
if the original poster deletes their post, we have no obligation to
remove the row, but if asked we will (`/admin/drops` will get a delete
button when this comes up).

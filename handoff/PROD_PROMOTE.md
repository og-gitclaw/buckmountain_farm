# How buckmountain.farm Goes Public

## Current state (after 2026-05-19/20 setup)

`buckmountain.farm` is **provisioned but not public**:

- DNS at GoDaddy points at Vercel (A 76.76.21.21, CNAME www → cname.vercel-dns.com)
- Vercel project `mustwemuse-2641s-projects/buckmountain-farm` has the custom domain registered + verified
- A production deployment exists at `https://buckmountain-farm.vercel.app/`
- **Vercel Deployment Protection is ON** — every public visitor hits an auth wall ("Vercel Authentication required") and sees no content

So anyone who guesses the URL today gets a login screen, not the site. This satisfies the "preview-only, no prod without explicit OK" rule per project memory.

## What "going prod" means (= 1 toggle)

To make buckmountain.farm publicly visible, exactly ONE thing needs to change:

→ **Turn off Deployment Protection in the Vercel dashboard.**

That's it. DNS is already pointed, the cert is already issued, the deployment is already labeled "Production" internally.

## The approval gate

Per memory (`project_brand_portfolio`), Randy is the cannabis-side partner for Buck Mountain (and Big Moose, cbd.restaurant, OG Life). buckmountain.farm sits on the cannabis side. So the gate is:

1. **Randy reviews the preview URL** — login to Vercel as a team member, visit https://buckmountain-farm.vercel.app/ — sees the actual site (auth wall doesn't apply to logged-in team members).
2. **Randy says OK in writing** — Slack, email, Signal — your call on the channel, but get it in writing.
3. **Brendon flips the toggle** — only Brendon should toggle the protection off, to avoid Randy accidentally pushing it live mid-review.

## How to flip the toggle (when ready)

In the Vercel dashboard:

1. Go to `https://vercel.com/mustwemuse-2641s-projects/buckmountain-farm/settings/deployment-protection`
2. Under **Vercel Authentication**, toggle "Require Log In" → OFF
3. Click **Save**

OR via CLI:

```bash
cd ~/Downloads/buckmountain_farm
# Update via Vercel REST API (token in ~/Library/Application Support/com.vercel.cli/auth.json)
# WARNING: This makes the site publicly visible immediately.
TOKEN=$(python3 -c 'import json; print(json.load(open("/Users/brendon/Library/Application Support/com.vercel.cli/auth.json"))["token"])')
TEAM_ID=team_qp8rvz0Cy51mX3n9t0iBKx9e
curl -X PATCH "https://api.vercel.com/v9/projects/buckmountain-farm?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

## How to roll back (= 1 toggle in the other direction)

Same place, flip "Require Log In" → ON.

DNS stays pointed; the site stops being publicly accessible within ~30 seconds (Vercel's edge cache TTL).

## What does NOT need to change to go live

- DNS at GoDaddy — already correct.
- Vercel project domain config — already verified.
- TLS cert — Vercel issued + renews automatically.
- The watcher → API pipeline — works on `buckmountain-farm.vercel.app` (auth-bypass via secret); flipping the public toggle doesn't affect the API at all.
- ADMIN_ASSET_INGEST_TOKEN — stays as is.
- Vercel Protection Bypass secret — stays as is. (It's how the openclaw watcher posts; will keep working after public toggle, since it's a separate mechanism.)

## What to confirm with Randy before flipping

(Bullets to send him in advance so he reviews the actual content, not just the URL.)

- Homepage copy reads OK — Hybrid Environments, Outdoor Hoop Dreams, FAQ
- Slow-scroll parallax backdrops are NOT overwhelming (the whole point of rebuilding; old site was)
- Categories present: flower, rosin, extracts, trim, smalls, pharma (coming soon)
- No stale claims (yield, THC %, organic, etc.) — every claim should be backable by a COA
- Photography is the real Buck Mountain product (not stock or stand-ins)
- Footer + contact info correct (which physical address / phone / email do we show, if any?)
- Legal: "Adults 21+", California compliance footer, no medical claims

## Domains pointing at Vercel right now

All resolve to `buckmountain.farm` (or its prod alias on Vercel):

- `buckmountain.farm` (DNS pointed, awaiting public toggle)
- `www.buckmountain.farm` (CNAME → cname.vercel-dns.com — auto-redirects to apex once public)
- `buckmountain-farm.vercel.app` (stable Vercel alias, what the watcher uses)
- `buckmountain-farm-mustwemuse-2641s-projects.vercel.app` (team-scoped Vercel alias)

## Note: GitHub<>Vercel integration is NOT yet connected

Right now, pushes to GitHub do NOT auto-deploy. Every deployment is done manually via `vercel deploy --prod` from `~/Downloads/buckmountain_farm/`.

To enable auto-deploy on every push to main, install the Vercel GitHub App on the `og-gitclaw` GitHub org and grant it access to `buckmountain_farm`:

1. Go to https://github.com/apps/vercel
2. Click Configure → og-gitclaw
3. Add `buckmountain_farm` to "Repository access"
4. In Vercel project → Settings → Git → Connect git repository → og-gitclaw/buckmountain_farm

After that, each `git push origin main` auto-creates a Vercel preview deployment + the configured production deployment on the matching branch.

# Google SSO + OGLife.app Consent Network — buckmountain.farm

## Why Google-only

Per Brendon directive: **all logins go through Google SSO.** No password
forms, no magic links, no email/password — Google or nothing.

Reasons:
- Same identity surface for customers (loyalty) + agents (portal)
- 2FA, phishing resistance, account recovery all handled by Google
- Lets us reuse the OG Life Google Workspace tenant if Brendon decides
  to consolidate later
- 21+ verification is **separate** from SSO (we never trust Google's
  birthday field) — we ask at the consent step

## Default consent boxes

After Google SSO succeeds, the user lands at `/auth/consent` with these
defaults:

| Checkbox | Default | Required? | Notes |
|---|---|---|---|
| 21+ verification | ✅ checked | YES | Form will not submit without this |
| Cannabis-related interest | ✅ checked | no | Pre-selected per directive |
| OG Life consent network link | ✅ checked | no | Cross-brand consent (OG Life, BMH, Buck Mountain) |
| Marketing email | ⬜ unchecked | no | TCPA / CAN-SPAM safer to require explicit opt-in |
| Marketing SMS | ⬜ unchecked | no | TCPA hard requirement — affirmative opt-in only |
| Push notifications | ⬜ unchecked | no | Browser will also gate this with native prompt |

The pre-checked defaults are NOT auto-saved without the user clicking
"I agree, continue." This avoids dark-pattern liability — the user
sees what we have pre-checked and can uncheck before submit.

## What's wired today (2026-05-24)

- `GET /api/auth/google` — kicks off OAuth (returns 503 with help text
  until `GOOGLE_OAUTH_CLIENT_ID` is set)
- `GET /api/auth/google/callback` — token exchange + userinfo +
  cookie-based session + redirect to consent
- `/auth/consent` — the consent page with the defaults above
- `POST /api/auth/consent` — writes consents to session (DB row TODO
  until Neon is provisioned)

## What you (Brendon) need to do

1. **Create a Google Cloud project** (or reuse the OG Life one).
   - Console → IAM & Admin → Create project → "buckmountain-farm" (or use existing OGLife project).
2. **Enable the OAuth consent screen.**
   - APIs & Services → OAuth consent screen
   - User type: External
   - App name: "Buck Mountain Cannabis"
   - User support email: mustwemuse@gmail.com
   - App logo: (drop the Buck Mountain mark)
   - Authorized domains: `buckmountain.farm`, `oglife.app` (so the
     consent flow can also redirect into the OG Life network)
   - Developer contact: mustwemuse@gmail.com
3. **Create OAuth 2.0 client credentials.**
   - Type: Web application
   - Name: "buckmountain.farm prod"
   - Authorized redirect URIs:
     - `https://buckmountain.farm/api/auth/google/callback`
     - `https://buckmountain-farm.vercel.app/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (for dev)
4. **Set env vars in Vercel:**
   - `GOOGLE_OAUTH_CLIENT_ID` = the client ID
   - `GOOGLE_OAUTH_CLIENT_SECRET` = the secret
   - `GOOGLE_OAUTH_REDIRECT_URI` = `https://buckmountain.farm/api/auth/google/callback`
     (omit to auto-derive from the request origin)
   - `SESSION_SECRET` = `openssl rand -hex 32` (for JWT signing — P3)
5. **Publish the OAuth consent screen** (Submit for verification).
   - Until verified, you'll see "unverified app" warnings. That's OK
     for preview / staging — verify before public launch.

## OGLife consent network — what it actually does

The "OG Life consent network" checkbox links the user's Buck Mountain
account into the cross-brand opt-in pool:

- BMH (Big Moose Hemp) sees them as a known cannabis-curious user
- cbd.restaurant gets them on the CBD-product audience
- OGLife.app rewards their scan history across all brands

Implementation: when the user checks the box, we send their Google `sub`
+ email hash to the OG Life API (`OGLIFE_API_BASE_URL` + `OGLIFE_API_KEY`)
which mirrors the consent into the network's user store. Users can
unlink anytime from `/account/network` (P3 page).

## Session storage

- Cookie: `bm_session`, httpOnly, secure, sameSite=lax, 30-day TTL
- Payload: signed JWT (P3 — currently base64url JSON placeholder)
- Refresh: silent re-issue on any authenticated request older than 7 days

## Roles

`agents.role` controls portal access:

- `rep` — sees only their assigned dispensaries, can file visits, send
  blasts to their accounts
- `manager` — sees all reps' dispensaries, can reassign
- `admin` — full access including QR sheet ingest review, schema changes

Roles are assigned manually by an admin via SQL until P4 builds a
`/admin/agents` UI.

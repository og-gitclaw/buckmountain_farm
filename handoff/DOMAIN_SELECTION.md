# Domain Selection — Best "Buck" Domain Picker Checklist

**Per Brendon directive 2026-05-24:** "Go through my GoDaddy / Porkbun /
Vaglio, pick the best domain related to the keyword 'Buck'."

**Status:** This sandbox does not have access to GoDaddy / Porkbun /
Vaglio / Cloudflare. Default = stay on `buckmountain.farm` (active,
DNS pointed, cert issued, deployment live behind auth wall). Brendon
runs this checklist from the home machine with credentials.

## Currently in flight

- **Primary:** `buckmountain.farm` — registered at GoDaddy, DNS to
  Vercel, Vercel project verified, auth-walled.
- **Mail domain:** `mail.oglife.app` — handles MX for buckmountain.farm
  via SPF softfail.

## Scoring criteria (use this from the home machine)

For each Buck-related domain in your GoDaddy / Porkbun / Vaglio
inventory, rate 0-3 on the dimensions below. Highest total wins.

### 1. Brand fit (0–3)

- 3: includes "buck mountain" or "buck mtn" verbatim
- 2: includes "buck cannabis" or "buck weed" or "buck farm"
- 1: includes just "buck" + a relevant suffix
- 0: ambiguous (`buckaroo.com`, `buckle.com`, etc.)

### 2. TLD trust (0–3)

- 3: `.com`, `.farm`, `.coop`, `.shop`, `.store`
- 2: `.co`, `.io`, `.app`, `.net`
- 1: `.xyz`, `.online`, `.life`
- 0: TLDs that are spam-associated (`.zip`, `.fit`, `.tk`)

### 3. Length + memorability (0–3)

- 3: ≤ 12 chars, single word, easy to spell on the phone
- 2: ≤ 18 chars, two words, no hyphens
- 1: hyphenated or > 18 chars
- 0: contains numbers or hard-to-spell tokens

### 4. SEO baseline (0–3) — *check Ahrefs MCP*

For each candidate, use the Ahrefs MCP (already loaded in this account):

```
site-explorer-domain-rating <candidate.com>
site-explorer-backlinks-stats <candidate.com>
```

- 3: DR > 5, > 10 referring domains
- 2: DR 1-5, some referring domains
- 1: DR 0, no history but never burned
- 0: appears in any spam list, or DR was high but tanked (penalty risk)

### 5. Cannabis platform compatibility (0–3)

- 3: TLDs accepted by Weedmaps + Leafly + Nabis without manual review
  (`.com`, `.farm`, `.store`, `.shop`)
- 2: usually accepted with confirmation
- 1: case-by-case review
- 0: routinely rejected (`.xyz`, `.online`)

### 6. Compliance / liability (0–3)

- 3: no trademark conflicts, no famous-mark squatting
- 2: minor potential conflict, low risk
- 1: shares brand fragment with a competitor in the space
- 0: clear conflict — don't use

### 7. Domain registrar quality of life (0–3)

- 3: at Porkbun or Vaglio (cheap renewals, easy DNS, no upsells)
- 2: at Cloudflare Registrar (cost-price renewals but slow transfers)
- 1: at GoDaddy (works fine but renewal markup)
- 0: at sketchy registrars

## Total: 21 max. Anything ≥ 16 is shippable. Anything ≥ 18 is a clear winner.

## Comparison template

| Domain | Brand | TLD | Length | SEO | Cannabis | Legal | Registrar | TOTAL |
|---|---|---|---|---|---|---|---|---|
| buckmountain.farm | 3 | 3 | 2 | 1 (current) | 3 | 3 | 1 | **16** |
| buck.farm | 1 | 3 | 3 | ? | 3 | ? | ? | ? |
| buckmtn.com | 2 | 3 | 3 | ? | 3 | 3 | ? | ? |
| buckmountaincannabis.com | 3 | 3 | 1 | high (current legacy) | 3 | 3 | 1 | ? |
| buckmountain.shop | 3 | 3 | 2 | ? | 3 | 3 | ? | ? |
| buckmountain.co | 3 | 2 | 2 | ? | 2 | 3 | ? | ? |

Fill in the `?` cells from your registrar dashboards + Ahrefs.

## What to do once a winner is picked

1. Add the new domain in Vercel: project → settings → domains.
2. Update DNS at the registrar to match the Vercel verification record.
3. Add a 301 redirect from `buckmountain.farm` → new domain.
4. Update env vars: `metadataBase`, `NEXT_PUBLIC_BASE_URL` if added.
5. Update `app/layout.tsx` `metadataBase`.
6. Update Google OAuth authorized redirect URIs (add the new domain).
7. Update Alpine IQ webhook URLs if applicable.
8. Keep `buckmountain.farm` registered — never drop it, just redirect.

## Why not switch now from this remote sandbox

I can't access your registrar consoles from here. Even if I could
guess at domain candidates, picking the wrong one and pushing the
switch could break the active Vercel deploy + auth wall + DNS path.
Safer to enumerate candidates with you on the home machine and pull
the trigger together.

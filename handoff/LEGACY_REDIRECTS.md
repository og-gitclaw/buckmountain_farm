# Legacy URL Redirects — buckmountain.farm

Two old surfaces deep-link into Buck Mountain content. We need 301s on
*both ends* to preserve SEO equity and not break existing inbound links.

> **2026-07-15 correction — buckmountaincannabis.com is NOT Squarespace.**
> This doc previously instructed "Squarespace → Settings → Advanced → URL
> Mappings". That panel does not exist for this site and never did.
> `LEGACY_SITE_AUDIT.md`'s own 2026-05-25 correction (openclaw rip, commit
> `a5ee791`) established the legacy site is a **Next.js SPA behind
> Cloudflare**. §A below has been rewritten to match. The paths in §A are
> **unverified guesses** — see the accuracy note there before pasting any of
> them anywhere.

## What's already configured (in this repo)

`next.config.ts` → `async redirects()` covers the case where someone
hits a legacy path on **buckmountain.farm** itself:

| From | To | Reason |
|---|---|---|
| `/products`, `/products/:slug*` | `/strains`, `/strains/:slug*` | Squarespace catalog convention |
| `/shop`, `/shop/:rest*` | `/store` | Squarespace store convention |
| `/menu` | `/strains` | Dispensary-style menu |
| `/cart` | `/store` | No on-site checkout yet |
| `/account` | `/loyalty/account` | Customer account moved |
| `/login`, `/sign-in` | `/api/auth/google` | SSO replaces password |
| `/coa-library`, `/coas` | `/coa` | Single COA lookup page |
| `/locator`, `/find-us`, `/where-to-buy` | `/wholesale` | Dispensary discovery moved |
| `/instagram`, `/ig` | https://www.instagram.com/buckmountaincannabis/ | Direct social hand-off |
| `/award-winning-rosin-*` | `/strains/rosin-vape-half-gram` | BigCommerce SKU URL |
| `/cold-pressed-rosin-*` | `/strains/rosin-vape-half-gram` | Alt SKU URL |
| `/disposable-vape-*` | `/strains/rosin-vape-half-gram` | Alt SKU URL |

## What you still need to do (from the home machine)

### A. buckmountaincannabis.com (Next.js SPA behind Cloudflare)

**Stack, as established by the 2026-05-25 openclaw rip (`a5ee791`) and
recorded in `LEGACY_SITE_AUDIT.md`:** the legacy site was already migrated
off whatever it used to run on and is now a **Next.js SPA served from the
same host, fronted by Cloudflare** (which bot-blocks headless Playwright —
`curl` with a real browser UA gets through; assets resolve at `/images/*`).

There is therefore **no vendor redirects panel to paste a block into**. The
three real options, in the order they're worth considering:

1. **Point the legacy domain at us.** DNS for buckmountaincannabis.com →
   buckmountain.farm, and every legacy path is then handled by this repo's
   `next.config.ts redirects()`. Simplest, one place to maintain, and it makes
   the on-domain rules already in `next.config.ts` do real work instead of
   only catching hand-typed URLs. Costs the legacy origin.
2. **Cloudflare Bulk Redirects / Redirect Rules** on the legacy zone. Keeps
   the legacy origin alive; rules live in the Cloudflare dashboard.
3. **Edit the legacy Next app's own `next.config`** and redeploy it. Requires
   access to that app's repo + deploy pipeline — unknown whether Brendon has
   either. Worth checking before assuming.

> **Accuracy note — the path list below is UNVERIFIED.** It is inherited from
> the era when this doc assumed Squarespace, and the paths were guessed from
> that vendor's conventions, not read off the legacy site. As of this writing
> only **`/blog`** is confirmed to exist (search hit, per `LEGACY_SITE_AUDIT.md`).
> `/about`, `/contact`, `/products`, `/shop`, `/wholesale`, `/coa` are exactly
> the "invisible pages" that audit's §"What the Chrome MCP rip needs to fill"
> item 7 lists as **still needing confirmation**. Redirecting a path that never
> existed is harmless-but-useless; the risk is the opposite — a real legacy URL
> absent from this list silently loses its equity.
>
> **Do this first, from a machine that gets a response** (the sandbox returns
> empty; Cloudflare 403s headless):
> ```
> curl -sA "<real-browser-UA>" https://buckmountaincannabis.com/sitemap.xml
> curl -sA "<real-browser-UA>" https://buckmountaincannabis.com/robots.txt
> ```
> Build the redirect map from the **actual** sitemap. Do not ship this guessed
> list as-is.

Whichever option is chosen, the destination side is the mapping already
encoded in `next.config.ts redirects()` — reuse it rather than re-deriving it.

**Important:** do NOT take the legacy site down until the 301s have propagated
through Google. ~90 days minimum, ~180 to be safe.

### B. cbd.restaurant (BigCommerce)

BigCommerce admin → **Storefront → Web Pages → 301 Redirects**.

For the rosin disposable SKU (and any other Buck Mountain product that
ever lived on cbd.restaurant):

```
/award-winning-rosin-half-gram-disposable-vape-pen -> https://buckmountain.farm/strains/rosin-vape-half-gram
```

BigCommerce lets you bulk-upload via CSV — export the product list,
filter to brand=B M, generate the redirect rows from the product URL
column. ~30 minutes of work.

### C. Google Search Console

After both sets of 301s are live:

1. Add buckmountain.farm as a property in Search Console (if not already)
2. Submit the new sitemap: https://buckmountain.farm/sitemap.xml
3. Use "Change of Address" (legacy property → new property) for
   buckmountaincannabis.com
4. Monitor "Coverage" → 301s should show up as "Excluded by 'noindex'"
   on legacy, then "Indexed" on the new URLs over a few weeks

## Why this matters

The legacy URLs have SEO equity — backlinks, ranking history, click
patterns Google has memorized. Without 301s on the old hosts, that
equity is lost when we point DNS away. With 301s, it transfers 90%+
within 90 days.

The redirects in `next.config.ts` only cover the case where someone
hits a legacy path on the NEW domain (e.g. they pasted
`buckmountain.farm/products` into the URL bar). That's a much smaller
set of traffic than the actual legacy-host redirects.

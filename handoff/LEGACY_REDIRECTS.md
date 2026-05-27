# Legacy URL Redirects — buckmountain.farm

Two old surfaces deep-link into Buck Mountain content. We need 301s on
*both ends* to preserve SEO equity and not break existing inbound links.

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

### A. buckmountaincannabis.com (Squarespace)

The Squarespace dashboard has a URL-redirects panel at:

```
Settings → Advanced → URL Mappings
```

Paste this block in (Squarespace's format is `oldpath -> newpath [301-or-302]`):

```
/ -> https://buckmountain.farm/ 301
/blog -> https://buckmountain.farm/blog 301
/blog/[slug] -> https://buckmountain.farm/blog/[slug] 301
/about -> https://buckmountain.farm/about 301
/contact -> https://buckmountain.farm/contact 301
/products -> https://buckmountain.farm/strains 301
/products/[slug] -> https://buckmountain.farm/strains/[slug] 301
/shop -> https://buckmountain.farm/store 301
/wholesale -> https://buckmountain.farm/wholesale 301
/coa -> https://buckmountain.farm/coa 301
```

Once those are in place, Squarespace serves the 301 to anyone hitting
the legacy host — Google replaces the legacy URL in its index with the
new buckmountain.farm URL over the next 30-90 days.

**Important:** do NOT take down the Squarespace site until the 301s have
propagated through Google. ~90 days minimum, ~180 to be safe.

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

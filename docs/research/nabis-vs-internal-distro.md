# Nabis vs. Internal Distribution — Tradeoff Memo

**Status:** Draft. Numbers are placeholders pending Randy's confirmation
of actual Nabis fees on the Buck Mountain account.

## The question

Buck Mountain has its own California cultivation + distribution license.
Should we keep using Nabis as the primary distributor, build internal
distribution, or run a hybrid?

## What Nabis gives us today

From `https://www.nabis.com/services/distribution`:

- Warehousing at 5 facilities (CA + NV + NY)
- Bi-weekly batch pickup
- Testing coordination (third-party lab logistics)
- Shipping to ~1,400 retailers in CA + NV
- Cash collection + AR (chasing late retailers)
- Compliance support (COA + license doc storage)
- Platform API (`platform-api.nabis.pro/v2`) for orders / inventory / invoices
  / retailers / warehouses

Nabis distributes 400+ brands → significant retailer reach we'd take years
to build solo.

## What internal distribution would give us

With Buck Mountain's existing distro license:

- Direct retailer relationships (no Nabis between us and the buyer)
- Margin recapture — we keep Nabis's cut
- Faster turnaround on hot drops (no waiting for bi-weekly Nabis pickup)
- Brand control: our truck, our boxes, our story to the budtender
- Real-time inventory truth (we own the Metrc package movements)

Cost:
- Drivers + trucks + insurance + warehouse + AR staff
- Compliance overhead: every transfer = Metrc package movement, every
  invoice = OCS-style audit trail
- Retailer acquisition is slow; cold calling dispensaries that already
  buy from Nabis is hard

## Numeric placeholder model

> **All numbers TBD — fill in with real data after Randy provides
> Nabis margin breakdown.**

| Line item | Nabis (now) | Internal (target) |
|---|---|---|
| Distributor fee % of wholesale | ~10-15% (typical industry) | 0% |
| Driver/truck/insurance | $0 | ~$8-12k/mo (1 driver, 1 cargo van, CA cargo insurance) |
| Warehouse rent | $0 (Nabis warehouses) | ~$3-6k/mo (Nevada County legal cannabis warehouse) |
| AR staff | $0 (Nabis chases) | ~$4-6k/mo (1 FT) |
| Compliance overhead | absorbed | ~10-15 hrs/wk of someone's time |
| Retailer reach | 1,400 in CA | grow from 0 |
| Speed to retailer | 2 weeks avg | same-day possible |
| Cash collection days (DSO) | Nabis-bonded | depends on retailer terms |

**Break-even back-of-envelope:** If Nabis takes ~12% of $X wholesale
revenue per month, internal distro at ~$15-20k/mo fixed cost becomes
cheaper when monthly wholesale > **$125-170k**. Anything below that,
Nabis is cheaper to use because their cost scales with volume; ours
is mostly fixed.

⚠️ This needs Randy's real numbers before any decision.

## Compliance: can we put QR codes on Nabis-distributed jars?

Per Nabis's compliance support page, brands ship their own packaging.
**Nothing in Nabis's public-facing docs prohibits brand-side QR codes
on jars**, and many brands do this (Cookies, Stiiizy, etc. all put
brand-side QR or NFC on packages).

What we DO need to confirm:

1. **CA DCC packaging compliance** — the universal symbol, batch tag,
   THC %, "Government Warning" text are all REQUIRED. Our QR is
   additive, not replacement.
2. **Metrc tag separability** — Metrc's package tag must remain
   scannable as-is by retailers/inspectors. Our QR is brand-side,
   separate from the regulatory tag.
3. **Nabis label-printing pipeline** — if Nabis prints any compliance
   labels themselves at warehouse intake, our QR must be on the jar
   BEFORE it ships to them. (Confirmed possible — brands ship
   "retail-ready" units.)

**Recommendation:** QR codes printed at our packaging step, before
the jar leaves Buck Mountain. Nabis treats them as part of the brand
artwork. No regulatory blocker expected.

## Hybrid recommendation (preliminary)

Don't make this an either/or. Phased:

1. **Now (P3.0):** Stay on Nabis for retailer reach. Wire the API
   read-only so we have visibility into orders + invoices in our dashboard.
2. **3-6 months (P3.1):** Start direct relationships with our 10 closest
   retailers (Sierra foothills + Bay Area headstore network). Bypass
   Nabis on those; keep Nabis for the long tail.
3. **6-12 months (P3.2):** If direct retailers > 30% of revenue, hire
   driver + AR. At that point, internal distro becomes the cheaper path
   for those accounts.
4. **12+ months (P3.3):** Open the internal distro as a SERVICE for other
   legacy brands in our network (Big Moose, etc.). Diversifies revenue.

## Action items

- [ ] Randy: provide Nabis fee % + last 6 mo wholesale revenue (for break-even math)
- [ ] Randy: list current top-10 retailers (the ones to consider going direct on first)
- [ ] Brendon: wire Nabis API read-only — visualize order flow + invoice DSO in dashboard
- [ ] Legal review: QR-on-jar compliance with CA DCC packaging rules
- [ ] Cost estimate: cannabis-legal warehouse rent in Nevada County

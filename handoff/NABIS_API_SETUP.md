# Nabis API Setup — Cultivator Handoff

**Purpose:** Step-by-step for whoever runs the Nabis account day-to-day (cultivator / brand admin) to enable Nabis Platform API access and forward the credentials to Brendon so we can wire it into buckmountain.farm.

**Time required:** ~10 minutes once help@nabis.com responds (Nabis side usually <1 business day).

**Who can do this:** Must be a user with admin-level access to the Buck Mountain Nabis org. If you can see your team's user list at app.getnabis.com → Team, you're probably fine. If not, ask whoever set up the Nabis account.

---

## Step 1 — Email Nabis Support to enable API access

API access is gated. The "API" tab inside the Nabis app only appears after Nabis enables it for your org.

**Send this email:**

> **To:** help@nabis.com
> **Subject:** API access request — Buck Mountain Cannabis
>
> Hi Nabis team,
>
> Please enable Platform V2 API access for our brand account, Buck Mountain Cannabis. We're integrating our brand website (buckmountain.farm) with order, inventory, and invoice data and need API key generation enabled on our Team → API tab.
>
> - Brand / Org name on Nabis: **Buck Mountain Cannabis**
> - California cannabis license #: _<fill in your CDPH / DCC license number>_
> - Primary contact (for API issues): _<your name + email + phone>_
> - Secondary contact (developer): Brendon — mustwemuse@gmail.com
>
> Please confirm once enabled and let us know if any additional documentation is required.
>
> Thanks,
> _<your name>_

**What to expect back:** A reply confirming API access is enabled on the org, plus any extra forms/agreements they want signed. Some accounts have to acknowledge an API terms-of-use addendum — sign whatever they send.

---

## Step 2 — Log into the Nabis app

URL: **https://app.getnabis.com/**

Use the same login you use to manage orders. If you don't remember the password, the "Forgot password" link works — just make sure you reset it from a device on a network you control (don't do this on a customer's wifi).

---

## Step 3 — Generate the API key

Per Nabis docs (https://developers.nabis.com/v2/docs/overview/generating-api-key/):

1. In the left-hand navigation menu, select **Team**.
2. In the tabs across the page, select **API**.
   - ⚠️ If you don't see an **API** tab, Nabis hasn't enabled access yet — go back to Step 1 and follow up with help@nabis.com.
3. Click **Generate API Key**.
4. Name the key: **`buckmountain-farm-website-prod`**
   - (If you create a second one later for testing, name it `buckmountain-farm-website-dev`. Never reuse the same key across environments.)
5. Click **Save**.
6. **COPY THE KEY IMMEDIATELY.** Most platforms only show the secret value once — if you close the dialog without copying it, you'll have to revoke and regenerate.

---

## Step 4 — Send the credentials to Brendon (securely)

⚠️ **Do not send the API key over plain email, SMS, or Slack DM.** Treat it like a password.

Use **one** of these:

- **Preferred:** 1Password shared vault item (Brendon can set this up — ask him for a shared "Buck Mountain — Nabis API" vault link).
- **Acceptable:** Signal message to Brendon's number with disappearing messages set to 1 day.
- **Last resort:** Email to mustwemuse@gmail.com with the key split across two separate emails (first half in email 1, second half in email 2, subject lines unrelated to "nabis" or "api").

**What to send — all of the following:**

| Field | Where to find it | Example |
|---|---|---|
| API key | The value you copied in Step 3 | `nab_live_xxxxxxxxxxxxxxxxxxxxxxxx` |
| Key name | What you named it in Step 3 | `buckmountain-farm-website-prod` |
| Nabis Org ID / Brand ID | Visible in URL after login (e.g. `app.getnabis.com/orgs/<ID>/...`) — paste the full URL | `https://app.getnabis.com/orgs/abc123/orders` |
| California license # on file with Nabis | Your CDPH / DCC license number | `CDPH-10001234` |
| State(s) of operation enabled | California? Nevada? New York? | `CA` |
| Warehouse(s) you ship from | Visible in Nabis app → Warehouses | `Nabis Oakland`, `Nabis LA` |
| Your Nabis account manager | Name + email — usually in your welcome email or in the app footer | `Jane Doe <jane@nabis.com>` |
| Nabis API support contact | Should be in the help@nabis.com reply from Step 1 | `apisupport@nabis.com` (if different) |
| Date issued | Today's date | `2026-05-19` |

---

## Step 5 — Confirm the key actually works

Brendon will test the key with this curl (don't run this yourself unless you're comfortable with the terminal — it just confirms the key is live):

```bash
curl https://platform-api.nabis.pro/v2/warehouses \
  -H 'x-nabis-access-token: <KEY>'
```

- ✅ 200 + JSON = good, we're wired in.
- ❌ 401 "Invalid API key" = the key didn't activate; go back to Step 1 and ask help@nabis.com.

---

## What Brendon will do with this

Once we have the key:

1. Store it in Vercel env vars on the buckmountain.farm project (encrypted at rest, never committed to git).
2. Build a sync job that pulls orders/inventory/invoices/retailers/warehouses on a schedule (Nabis exposes: `/orders`, `/inventories`, `/invoices`, `/retailers`, `/warehouses`, `/nabis-days-off`).
3. Cross-reference Nabis order data with Metrc batch tags so each jar's QR code can show "this jar was distributed to <retailer> on <date>" — relevant for the OGLife.app QR rewards flow.
4. Surface alerts in the buckmountain.farm admin dashboard for low inventory, slow-paying retailers, missed pickup days.

**None of this changes how you currently use Nabis.** The API is read-only-flavored (initial scope), so we're observing, not pushing orders to them.

---

## What if Nabis takes more than 2 business days

Escalation path:

1. Reply to your original help@nabis.com thread asking for an ETA.
2. If still no response after another business day: post in the Nabis brand Slack/community channel (if you're in one), or contact your account manager directly.
3. If still stuck after a week: tell Brendon — there's a backup plan to scrape order CSVs out of the Nabis web app on a schedule until they enable the API. Not ideal but it unblocks us.

---

## Security notes — please read

- **The API key gives whoever has it read access to your Nabis order book, inventory, invoices, and retailer relationships.** Treat it as sensitive as a banking login.
- If the key ever leaks (laptop stolen, accidentally posted, etc.) — go to Nabis app → Team → API → revoke the key. Then generate a new one and re-send to Brendon.
- **Rotate the key every 90 days** as a hygiene practice. Calendar reminder helps. We can automate this on our side later.
- We will never need your Nabis login password. If anyone asks for the password — even if they claim to be Brendon or Nabis support — it's a scam.

---

**Questions?** Reply on Signal or email mustwemuse@gmail.com. — Brendon

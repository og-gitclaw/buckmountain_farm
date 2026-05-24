# QR Sticker Workflow — Photoshop → openclaw → buckmountain.farm

**Source of truth:** Brendon directive 2026-05-24.

## What QR stickers actually are

Each sticker is an **authenticity stamp** for Buck Mountain jars (and any
other product we slap one on). Every sticker has a globally-unique token
encoded in its QR code. When a customer scans it, we look the token up
in our database:

- **Token is registered → real product.** Show them the strain page,
  COA, loyalty opt-in.
- **Token is unregistered → counterfeit signal.** Show a warning page
  and capture the scan for analytics.

For **v1 the sticker does NOT have to be tied to a specific jar/batch.**
It's an "is this a real Buck Mountain?" check, full stop. v2 expands to
per-jar product tracking, but per Brendon that's a later rollout.

## End-to-end pipeline

```
Photoshop dev team
    ↓ designs sticker sheets (50–75 stickers / sheet)
    ↓ generates tokens per sticker (12-char URL-safe nanoid)
    ↓ exports sheet image + token list to a Tailscale-synced folder
    ↓
openclaw  (Joshuas-Mac-mini.local, 24/7, Tailscale always-on)
    ↓ watcher polls every 30s
    ↓ classifies sheet images → bucket=qr-sheets
    ↓ runs QR decoder over the image (pyzbar)
    ↓ POSTs to /api/admin/qr-sheets with sheet_code + token list
    ↓
buckmountain.farm  (Vercel)
    ↓ POST /api/admin/qr-sheets
    ↓ → INSERT qr_sheets row
    ↓ → bulk INSERT qr_tokens (sheet_id set, batch_id NULL)
    ↓
Customer scans a sticker
    ↓ → /loyalty/scan/<token>
    ↓ → POST /api/loyalty/scan/<token>
    ↓ → token in qr_tokens? → yes → record scan, show strain page
    ↓ →                       no  → counterfeit warning
```

## Why Tailscale 24/7?

Brendon: "We can use Tailscale to sync with the openclaw for 24/7 real-time
processing of the QR codes and automatically sync with the Photoshop office."

Tailscale gives us:

- Mesh VPN between openclaw + Photoshop team + buckmountain.farm bastion
- File-level sync via Taildrop (or a synced folder on a shared host)
- No need to ship the team a one-off SFTP credential or VPN config
- Audit log: who synced what, when (Tailscale admin console)

Openclaw is already on Tailscale (`iamclaw@100.88.89.39`). The Photoshop
machine needs to join the same tailnet and either:

1. **Push:** drop sheets into a folder on openclaw via Taildrop
   (`tailscale file cp sheet.png iamclaw@openclaw:`), OR
2. **Pull:** openclaw mounts the Photoshop team's shared folder over
   the tailnet and rsyncs new files every 30s.

Option 1 is simpler — the Photoshop op doesn't have to keep their
machine awake. Option 2 is what we land on if the Photoshop team wants
to keep working in their normal workflow without an extra command.

## Token generation — who does it?

**Recommended: openclaw generates tokens, Photoshop renders them.**

Workflow:

1. Photoshop team requests a fresh batch ("need 500 tokens for next
   week's print run") via Slack or a small `/agent/qr/request` form.
2. buckmountain.farm pre-allocates 500 tokens into `qr_tokens` with
   `sheet_id=NULL` (held aside; will be linked once the sheet is
   ingested by the watcher).
3. The token list is dropped into the Photoshop synced folder as a
   plain-text file (`tokens-2026-W21.txt`).
4. Photoshop renders each token as a QR + Buck Mountain artwork into
   a sheet PNG.
5. Sheet PNG + the same token list are saved back to the synced
   folder with `sheet_code` in the filename (e.g.
   `BMC-2026-W21-A03_sheet.png` + `BMC-2026-W21-A03_tokens.txt`).
6. Openclaw watcher picks both up, calls `/api/admin/qr-sheets` with
   the file contents.

Why pre-allocate instead of letting Photoshop generate? Token
collisions are catastrophic (scanner sees a real-looking token that
belongs to nobody → no scan record). Centralizing generation = zero
collision risk.

**Fallback:** if Photoshop already has their own token generator, we
accept submitted tokens via the same `/api/admin/qr-sheets` endpoint.
The endpoint is idempotent and rejects duplicates at the DB level.

## File naming convention

The watcher classifies by filename. Set the Photoshop export pipeline
to emit:

| File | Pattern | Bucket | Tag |
|---|---|---|---|
| Sheet image (PNG/JPG) | `BMC-YYYY-WWW-NNN_sheet.{png,jpg}` | `qr-sheets` | `qr-sheet` |
| Token list (TXT) | `BMC-YYYY-WWW-NNN_tokens.txt` | `qr-sheets` | `qr-tokens` |
| Sheet proof (PDF, optional) | `BMC-YYYY-WWW-NNN_proof.pdf` | `qr-sheets` | `qr-sheet-proof` |

`YYYY-WWW-NNN` = year, ISO week, run number within that week.

## Counterfeit handling

When a scan hits an unregistered token, the API returns
`{ ok: false, error: "not-a-valid-sticker" }`. The frontend shows a
soft warning ("This sticker isn't in our system — if you bought this
from a licensed retailer, please email tips@buckmountain.farm").

We don't shame the customer. The pattern of unregistered scans
becomes intel for finding counterfeiters.

## Sticker lifecycle

- `qr_tokens.is_active = true` → scans work, points earned
- `qr_tokens.is_active = false` → scans rejected (`410 token-retired`)
- Retire reasons: sheet recalled, printer error, anti-counterfeit
  rotation

## What's wired today (2026-05-24)

- ✅ `POST /api/admin/qr-sheets` endpoint (stub — auth + validation work,
  DB writes are TODO until Neon is provisioned)
- ✅ `POST /api/loyalty/scan/[token]` endpoint (stub — auth + scan record
  shape work, DB lookups are TODO)
- ✅ `qr_sheets` + `qr_tokens` schema with `batch_id` nullable
- ✅ Customer landing at `/loyalty/scan/<token>`

## What needs to happen next

1. Provision Neon and apply `db/schema.sql`. (P2 in the original plan.)
2. Wire the QR decoder into `scripts/openclaw_watcher.py`:
   - Detect `bucket=qr-sheets` by folder name
   - On a new image, run `pyzbar.decode()` over the PNG
   - Pair the decoded tokens with the matching `_tokens.txt` if both
     are present (defensive — should match exactly)
   - POST to `/api/admin/qr-sheets` with the result
3. Build the token allocation request UI at `/agent/qr/request`.
4. Loop the Photoshop team in on the synced folder location + the
   naming convention above.
5. Print a small test sheet, scan one, watch the round-trip work end
   to end.

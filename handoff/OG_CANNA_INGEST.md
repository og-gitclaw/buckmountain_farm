# Og Canna ingest — engineered extract from Signal Desktop

> **Status:** PLAN / not started. This doc is the brief for the **openclaw
> orchestrator Claude Code session running on the local Mac** (the same
> machine Signal Desktop is logged into). It is NOT for chl0e on openclaw;
> chl0e gets the cleaned output via the existing `POST /api/admin/assets`
> rail (see `handoff/CINEMATIC_STRAIN_PREVIEWS.md`).
>
> Paste **§A** into the orchestrator session. It is self-contained.

---

## Context

"Og Canna" is Brendon's **own** Signal thread — his recording device sends
flower videos + adjacent price/batch messages to it. It is the **source of
truth** for:

1. **Current strain inventory** for `data/strains.ts` (`og-gitclaw/buckmountain_farm`)
2. **Pricing** (the `350✈️`-style messages that follow each video block)
3. **Cinematic-preview source video** (the macro flower clip §A stage 3 of
   `CINEMATIC_STRAIN_PREVIEWS.md` composites inside the glass jar)
4. Some items also belong to **new.cbd.restaurant** (hemp / CBD line).
   Routing rules below.

Strain identification: every flower clip ends with the bag flipped upside-
down so the **black sharpie abbreviation on the bottom** is visible for the
last ~2 seconds. That string is the OCR target.

## What this brief is NOT
- NOT a one-off scrape. The orchestrator should make the extract
  **re-runnable** on a date range so we can re-ingest weekly without
  re-doing manual work.
- NOT a silent mutator of `data/strains.ts`. Proposed new strains land as
  a draft PR for human review; never auto-merge into main.
- NOT for any other thread. Hard-code the thread filter to "Og Canna".

---

## §A — orchestrator session brief (paste this verbatim)

```
You are running in a Claude Code session on Brendon's Mac, the same machine
that has Signal Desktop installed and logged in. New standing job: extract,
label, and route every flower-bag video in the "Og Canna" Signal thread for
a given date range, producing a manifest + organized files that chl0e
(openclaw, separate machine) ingests via POST /api/admin/assets.

Work in stages and STOP at the end of stage 1 for sign-off.

ENVIRONMENT
- Signal Desktop on macOS stores attachments at
  ~/Library/Application Support/Signal/attachments.noindex/
  encrypted at rest. The SQLCipher key is in the macOS keychain under
  service "Signal Safe Storage", account "Signal Safe Storage".
  Signal must be RUNNING (or recently quit with keychain still authorized)
  to extract that key.
- The SQLite db itself lives at
  ~/Library/Application Support/Signal/sql/db.sqlite

STAGE 0 — set up the extractor (do this once, then never again):
  1. Install signal-export (https://github.com/carderne/signal-export) into
     a Python venv. Pin a version; record the commit SHA in the manifest.
     Do NOT install globally and do NOT touch system Python.
  2. Confirm it can read the keychain and open the db read-only:
       signal-export --list-threads
     Should list "Og Canna" among the threads. If it doesn't, escalate to
     Brendon — keychain probably wasn't authorized this session.
  3. Output a fingerprint of the source: SQLite db sha256 + signal-export
     version. Store at ~/buckmtn-ingest/og-canna/.toolchain.json so future
     runs can flag if Signal Desktop's schema changed.

STAGE 1 — feasibility extract (DO ONLY THIS, then report):
  Date range: --since=2026-05-05 --until=today  (last ~30 days)
  Thread filter: --thread="Og Canna" (or whatever signal-export's exact
  flag is — verify in --help)

  1. Dump attachments + adjacent messages to:
       ~/buckmtn-ingest/og-canna/2026-06-04/raw/
     For each attachment, also persist its surrounding context (5 messages
     before + 5 after) as raw.json so the pricing extract has signal.

  2. Filter to video attachments only (mp4, mov, m4v, webm). For each:
     - Compute sha256.
     - Read duration via ffprobe.
     - Extract the LAST 2 seconds, sample ~10 frames at 5fps.
     - On each frame: crop to the lower third of the frame, OCR with
       tesseract (PSM 7 or 8, single-line / single-word).
     - Take the highest-confidence non-empty token.

  3. Fuzzy-match the OCR token against the canonical strain list at
       https://buckmountain.farm/api/strains       (if exposed)
     or fall back to the committed list in
       og-gitclaw/buckmountain_farm  data/strains.ts
     using Levenshtein on the {slug, name, common abbreviations}. Common
     abbreviations Brendon uses: "PERM OG" = permanent-og, "GEL 41" =
     gelato-41, "PERM MK" = permanent-marker, "CHTH" or "CP" = cheetah-piss,
     "STRAW LOB" = strawberry-lobster, "GRP LOB" = grape-lobster, "HSHBRG" =
     hashberger, "XXX" = xxx-og. Add more as you discover them; persist
     learned abbreviations to ~/buckmtn-ingest/og-canna/.abbreviations.json
     so the next run is smarter than this one.

  4. Pricing extract from raw.json adjacent messages:
     - Regex for {number}{currency_or_unit}: e.g. "350✈️", "350$", "350/oz",
       "300/zip", "1600/qp".
     - Heuristic: if the message is from the SAME sender as the video, sent
       within 5 minutes after, and the message is short (< 40 chars), treat
       it as price-likely. Otherwise context-only.

  5. Routing classification:
     - cannabis (>0.3% THC, recreational) -> destination "buckmountain.farm"
     - hemp / CBD-dominant -> destination "new.cbd.restaurant"
     - DEFAULT to "buckmountain.farm" unless the OCR label OR an adjacent
       message contains a CBD/hemp signal token ("CBD", "hemp", "<0.3", "D8",
       "D9", "HHC", "rosin disp", "cart"). When in doubt, mark
       destination="needs-review" and quarantine — never silently send a
       hemp item to the recreational site or vice versa.

  6. Produce manifest.json at
       ~/buckmtn-ingest/og-canna/2026-06-04/manifest.json
     Shape:
       {
         "thread": "Og Canna",
         "date_range": { "from": "2026-05-05", "to": "2026-06-04" },
         "toolchain": { "signal_export_sha": "...", "tesseract_version": "..." },
         "videos": [
           {
             "sha256": "...",
             "signal_sent_at": "2026-05-12T14:23:11-07:00",
             "filename": "raw/<orig-name>.mp4",
             "duration_s": 12.4,
             "ocr_text": "PERM OG",
             "ocr_confidence": 0.92,
             "match": {
               "strain_slug": "permanent-og",
               "fuzzy_score": 1.0,
               "destination": "buckmountain.farm"
             },
             "adjacent_messages": [
               { "sent_at": "...", "text": "350✈️", "kind": "price-likely" }
             ],
             "output_path": "labeled/permanent-og/<sha>.mp4"
           },
           {
             "sha256": "...",
             "ocr_text": "BERRY CAKE",
             "match": {
               "strain_slug": null,
               "reason": "no-match-in-data/strains.ts",
               "destination": "buckmountain.farm",
               "proposed_new_strain": {
                 "slug": "berry-cake",
                 "name": "Berry Cake",
                 "needs_research": true
               }
             },
             ...
           }
         ],
         "summary": {
           "matched_existing": 0,
           "proposed_new": 0,
           "low_confidence_quarantined": 0,
           "destination_buckmountain": 0,
           "destination_cbd_restaurant": 0,
           "destination_needs_review": 0
         }
       }

  7. Move + copy the videos into the bucketed structure:
       labeled/<strain_slug>/<sha>.mp4               (high-confidence matches)
       proposed/<proposed_slug>/<sha>.mp4            (new strain candidates)
       needs-review/<sha>.mp4                        (low-confidence OCR)
       cbd-restaurant/<destination_slug>/<sha>.mp4   (hemp/CBD routed away)

  8. STOP. Print a one-screen summary to stdout:
       - n videos processed
       - n matched existing slugs (which ones)
       - n proposed new strains (slugs + handwriting OCR)
       - n quarantined for review
       - any signal-export errors

  Wait for Brendon's green light before stage 2.

STAGE 2 — propose data/strains.ts patch (after green light):
  For every "proposed_new_strain" in the manifest, draft a new entry in
  data/strains.ts using research_status="label-only" (means: we have the
  bag/label, nothing else yet). Use FAMILY_COLOR + family="Other" by
  default — Brendon will reclassify.

  Open as a DRAFT PR on og-gitclaw/buckmountain_farm, branch
  claude/og-canna-strain-additions, title:
    "data/strains.ts: 0309d3cd new entries from Og Canna 2026-06-04 ingest"
  Body: paste the manifest summary + the list of new slugs with their OCR
  source frames as inline images. Tag the new entries with a comment
  block referencing the manifest sha so we can trace provenance.

STAGE 3 — push to chl0e for cinematic processing:
  For every video in labeled/ (NOT proposed/, NOT needs-review/, NOT
  cbd-restaurant/), Tailscale-copy the file to chl0e's input dir on
  openclaw, then POST a record per file to {BUCKMOUNTAIN_BASE}/api/admin/assets
  with Bearer {ADMIN_ASSET_INGEST_TOKEN}, schema
  "buckmountain-farm/asset/v1", tags:
    ["strain-source-video", "strain:<slug>", "source:og-canna-signal",
     "ingest-date:2026-06-04"]
  chl0e then picks them up and runs the cinematic pipeline from
  CINEMATIC_STRAIN_PREVIEWS.md §A stages 2-4.

STAGE 4 — pricing patch (deferred, do not start without separate sign-off):
  The pricing manifest is captured but where it LANDS in the codebase is
  not yet decided. Wait for Brendon's call:
   - app/wholesale/page.tsx static? -> patch the data file.
   - DB-backed prices table? -> POST to a new /api/admin/prices route.
   - Out of scope for this site? -> stop here, manifest is the deliverable.

cbd.restaurant items (cbd-restaurant/ bucket):
  Do NOT push to buckmountain.farm. Leave them in the bucket; Brendon will
  route to the cbd.restaurant repo separately (BigCommerce-backed, per
  references in og-gitclaw/buckmountain_farm next.config.ts).

HARD RULES
- Never modify originals: signal-export reads the db read-only, all
  derivatives are copies.
- Idempotent by sha256 — re-running the same date range must not
  duplicate or re-OCR the same file.
- Low-confidence OCR (< 0.70) NEVER auto-matches — always quarantine.
- Stage 2 + 3 only run after Brendon sees the stage 1 summary.
- The keychain access is sensitive; never log or persist the SQLCipher
  key. signal-export should hold it in memory only.
```

---

## §B — back-end hooks already in place

The orchestrator does NOT need to invent new endpoints — the website
already exposes everything it needs:

- `POST /api/admin/assets` (Bearer `ADMIN_ASSET_INGEST_TOKEN`) — idempotent
  upsert by sha256, schema `buckmountain-farm/asset/v1`. Used by stage 3.
- `data/strains.ts` — extended in PR #20 (when merged) with
  `poster_url` / `tile_loop_url` / `cinematic_url`. The Og Canna source
  videos become the input for chl0e's stage 3 composite, which then
  populates those fields.

## §C — open routing questions

- [ ] `new.cbd.restaurant` — what repo, what API surface? `cbd-restaurant/`
      items will sit in the bucket until that's decided. (Mentioned in
      `aurora-mesh.tsx`, `before-after/page.tsx`, `next.config.ts` here, but
      no asset-ingest endpoint visible.)
- [ ] Pricing destination — wholesale page is static today (`app/wholesale/page.tsx`).
      Stage 4 of §A waits for the call: patch static file vs new
      `/api/admin/prices` rail.
- [ ] Common-abbreviation seed list in stage 1 step 3 — confirm or amend.

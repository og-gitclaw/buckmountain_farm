/**
 * /agent/qr/request — token allocation request for the Photoshop team.
 *
 * Form posts to /api/agent/qr/request. The backend:
 *   1. Pre-allocates N tokens into qr_tokens (sheet_id=NULL, batch_id=NULL)
 *   2. Drops the token list as `tokens-<sheet_code>.txt` into the
 *      Tailscale-synced folder Photoshop watches
 *   3. Returns the sheet_code + count for the agent's confirmation
 *
 * See handoff/QR_STICKER_WORKFLOW.md for the full pipeline.
 */

import Link from "next/link";

export default function QrRequest() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-32 pb-12 px-6 md:px-12 max-w-2xl mx-auto">
        <nav className="text-sm mb-4">
          <Link href="/agent" className="text-sky-400 hover:underline">
            ← Agent home
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">Request QR sticker tokens</h1>
        <p className="text-white/60 text-sm mt-2 max-w-prose">
          Pre-allocates a batch of authenticity tokens and drops them in the
          Photoshop team&rsquo;s synced folder. They render the sheet artwork,
          openclaw picks the export back up, and the loop closes when the
          sheet is ingested.
        </p>

        <form
          method="POST"
          action="/api/agent/qr/request"
          className="mt-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              How many tokens?
            </label>
            <input
              type="number"
              name="count"
              min={10}
              max={5000}
              step={10}
              defaultValue={500}
              required
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            />
            <p className="text-xs text-white/40 mt-1">
              Sheets are typically 50–75 per sheet — request enough for the
              next print run plus a 10% buffer.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Sheet code (optional — defaults to BMC-YYYY-WWW-NNN)
            </label>
            <input
              type="text"
              name="sheet_code"
              placeholder="BMC-2026-W22-A01"
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Notes (sent to Photoshop)
            </label>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder="For the Permanent OG jar run shipping next week. Use the purple-frame variant."
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-white text-black px-5 py-3 font-semibold"
          >
            Allocate tokens
          </button>
        </form>
      </section>
    </main>
  );
}

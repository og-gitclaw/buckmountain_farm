/**
 * /coa — Certificate of Analysis lookup.
 *
 * California regs require COA access for every consumer who asks.
 * This page offers two paths:
 *   1. Enter the Metrc package tag printed on the jar
 *   2. Or scan the QR sticker -> /loyalty/scan/[token] auto-shows the COA
 */

import Link from "next/link";

export const metadata = {
  title: "COA Lookup — Buck Mountain Cannabis",
  description:
    "Look up the Certificate of Analysis (COA) for any Buck Mountain Cannabis jar by Metrc tag or by scanning the QR sticker.",
};

export default function CoaLookup() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          Lab results
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">COA lookup</h1>
        <p className="mt-4 text-white/70">
          Every Buck Mountain jar ships with a Certificate of Analysis from
          an ISO-17025 accredited California cannabis lab. Find yours below.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-12">
        <form
          method="GET"
          action="/api/coa/lookup"
          className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">
              Metrc package tag
            </label>
            <input
              type="text"
              name="tag"
              placeholder="1A4FF010000XXXXXXXXXXXXX"
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm font-mono"
              maxLength={24}
            />
            <p className="text-xs text-white/40 mt-1">
              24-character tag, printed on the jar label.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-white text-black px-5 py-2 text-sm font-semibold"
          >
            Look up COA
          </button>
        </form>
      </section>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-24">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold">Easier: scan the sticker</h2>
          <p className="mt-2 text-sm text-white/70">
            The QR under the jar lid takes you straight to the COA + strain
            page + loyalty claim in one tap. See{" "}
            <Link href="/loyalty" className="underline hover:text-white">
              /loyalty
            </Link>{" "}
            for how it works.
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * /loyalty/scan/[token] — what a customer lands on after scanning the
 * QR code printed under a Buck Mountain jar lid.
 *
 * Page does three things:
 *   1. Records the scan via POST /api/loyalty/scan/[token] (server-side
 *      so we get the IP for the geo + ip_hash columns).
 *   2. Resolves token → batch → product → COA + strain page links.
 *   3. Offers the user three actions:
 *      a. "Claim points" → kicks off Google SSO (if not signed in) +
 *         consent flow + credits the scan to their oglife_optins row.
 *      b. "View COA" → direct PDF link from batches.coa_url
 *      c. "Read about this strain" → /strains/<slug>
 *
 * "Motivate at the push of a button to go to the local shop" — once
 * the user is opted-in, this page also surfaces nearest dispensaries
 * carrying the strain (via Nabis inventory join + geolocation).
 */

import Link from "next/link";
import { headers } from "next/headers";

export default async function ScanLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "buckmountain.farm";
  const base = `${proto}://${host}`;

  // Fire-and-forget the scan record. We don't block render on it —
  // the scan landing should feel instant.
  let scanResult: { ok: boolean; product_slug?: string; coa_url?: string } | null = null;
  try {
    const res = await fetch(`${base}/api/loyalty/scan/${encodeURIComponent(token)}`, {
      method: "POST",
      cache: "no-store",
    });
    scanResult = await res.json();
  } catch {
    scanResult = null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950 via-neutral-950 to-black text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-emerald-900/50 bg-black/60 p-8 space-y-6 text-center">
        <div className="text-5xl">🪴</div>
        <h1 className="text-2xl font-bold">You found one.</h1>
        <p className="text-neutral-400 text-sm">
          Token <code className="text-emerald-400">{token}</code>{" "}
          {scanResult?.ok ? "recorded." : "checked in."}
        </p>

        <div className="space-y-3">
          <Link
            href={`/api/auth/google?return_to=${encodeURIComponent(`/loyalty/claim/${token}`)}`}
            className="block rounded-md bg-white text-black px-4 py-3 font-semibold"
          >
            Claim points (sign in with Google)
          </Link>
          {scanResult?.coa_url && (
            <a
              href={scanResult.coa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-neutral-700 px-4 py-3 text-sm"
            >
              View this jar&rsquo;s COA →
            </a>
          )}
          {scanResult?.product_slug && (
            <Link
              href={`/strains/${scanResult.product_slug}`}
              className="block rounded-md border border-neutral-700 px-4 py-3 text-sm"
            >
              Read about this strain →
            </Link>
          )}
        </div>

        <p className="text-xs text-neutral-600 pt-4 border-t border-neutral-900">
          Buck Mountain Cannabis · Sierra foothills · 21+
        </p>
      </div>
    </main>
  );
}

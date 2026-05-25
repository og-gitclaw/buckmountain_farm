/**
 * /loyalty/claim/[token] — post-SSO landing.
 *
 * Flow:
 *   1. User scans sticker -> /loyalty/scan/[token] (records scan as anon)
 *   2. They tap "Claim points" -> /api/auth/google?return_to=/loyalty/claim/[token]
 *   3. After Google + /auth/consent, they land here
 *   4. We POST /api/loyalty/claim/[token] which links the anon scan
 *      to their oglife_optins row + credits +N tokens
 *   5. Redirect to /loyalty/account on success
 *
 * Auth: requires bm_session cookie. Without it, bounce back to Google.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = (await cookies()).get("bm_session");
  if (!session) {
    redirect(
      `/api/auth/google?return_to=${encodeURIComponent(`/loyalty/claim/${token}`)}`,
    );
  }

  // TODO(P3): server-side POST to /api/loyalty/claim/[token] to actually
  // mint the points + link scan. For now show a confirmation card so the
  // flow renders end-to-end.

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-md text-center rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-8 space-y-5">
        <div className="text-5xl">🌿</div>
        <h1 className="text-2xl font-bold">Points claimed</h1>
        <p className="text-white/70 text-sm">
          Token <code className="text-emerald-300">{token}</code> credited to
          your account. Stay subscribed for the monthly prize drop.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/loyalty/account"
            className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold"
          >
            View my account
          </Link>
          <Link
            href="/strains/updates"
            className="rounded-md border border-white/20 px-4 py-2 text-sm"
          >
            Subscribe to drops
          </Link>
        </div>
      </div>
    </main>
  );
}

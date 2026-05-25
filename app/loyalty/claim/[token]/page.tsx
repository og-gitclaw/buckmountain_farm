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

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();
  if (!session) {
    redirect(
      `/api/auth/google?return_to=${encodeURIComponent(`/loyalty/claim/${token}`)}`,
    );
  }

  // Forward the session cookie when calling our own API.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "buckmountain.farm";
  let credited = 0;
  try {
    const res = await fetch(`${proto}://${host}/api/loyalty/claim/${encodeURIComponent(token)}`, {
      method: "POST",
      cache: "no-store",
      headers: { cookie: hdrs.get("cookie") ?? "" },
    });
    const data = (await res.json()) as { credited?: number };
    credited = Number(data?.credited ?? 0);
  } catch {
    // Stay quiet — confirmation card still renders.
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-md text-center rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-8 space-y-5">
        <div className="text-5xl">🌿</div>
        <h1 className="text-2xl font-bold">
          {credited > 0 ? `+${credited} points` : "Points claimed"}
        </h1>
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

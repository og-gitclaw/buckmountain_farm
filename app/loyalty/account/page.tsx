/**
 * /loyalty/account — customer-facing loyalty dashboard.
 *
 * Shows the signed-in user:
 *   - Current point balance (from rewards_ledger sum)
 *   - Scan history (qr_scans joined to batches/products)
 *   - Active strain subscriptions (product_notification_subscribers)
 *   - Account settings shortcut (consents)
 *
 * Without a session cookie, redirects to Google SSO and back.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoyaltyAccount() {
  const session = (await cookies()).get("bm_session");
  if (!session) {
    redirect("/api/auth/google?return_to=/loyalty/account");
  }

  // TODO(P3): real DB lookups. Stubs below render the layout so the
  // page is testable without Neon.
  const balance = 0;
  const scans: { token: string; date: string; product?: string }[] = [];
  const subscriptions: { strain: string; channel: string }[] = [];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="uppercase tracking-[0.25em] text-xs text-white/50">
            Your account
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2">Loyalty</h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Point balance
          </p>
          <p className="text-3xl font-bold mt-1">{balance}</p>
        </div>
      </section>

      <section className="px-6 md:px-16 max-w-4xl mx-auto pb-12 grid gap-6 md:grid-cols-2">
        <Block title="Scan history">
          {scans.length === 0 ? (
            <p className="text-sm text-white/50 italic">
              No scans yet. Pop the lid on your next jar and scan the
              sticker underneath.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {scans.map((s) => (
                <li key={s.token} className="flex justify-between">
                  <span>{s.product ?? s.token}</span>
                  <time className="text-white/40">{s.date}</time>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Strain subscriptions">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-white/50 italic">
              You aren&rsquo;t subscribed to any drops yet.{" "}
              <Link href="/strains/updates" className="underline hover:text-white">
                Pick a few here.
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {subscriptions.map((sub, i) => (
                <li key={i} className="flex justify-between">
                  <span>{sub.strain}</span>
                  <span className="text-white/40 uppercase tracking-wider text-xs">
                    {sub.channel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </section>

      <p className="px-6 md:px-16 max-w-4xl mx-auto pb-24 text-xs text-white/40 italic">
        Real balance + scan history + subscriptions populate once the DB is
        wired (Neon, P2). Right now this is a layout-only stub.
      </p>
    </main>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

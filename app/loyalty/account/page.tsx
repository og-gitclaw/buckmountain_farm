/**
 * /loyalty/account — customer-facing loyalty dashboard.
 *
 * Reads:
 *   - rewards balance: SUM(delta_tokens) FROM rewards_ledger
 *   - scan history: qr_scans LEFT JOIN qr_tokens → batches → products
 *   - active strain subscriptions: product_notification_subscribers
 *
 * Falls back to a layout-only stub if the DB isn't configured.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";
import { RedeemRewards } from "@/components/redeem-rewards";

type Scan = {
  token: string;
  scanned_at: string;
  product_slug: string | null;
  product_name: string | null;
};
type Subscription = {
  strain_slug: string | null;
  product_slug: string | null;
  channel: string;
};

async function loadAccount(sub: string, email: string) {
  if (!dbConfigured()) {
    return { balance: 0, scans: [] as Scan[], subscriptions: [] as Subscription[], stub: true as const };
  }
  const sql = getSql();
  // Ensure the optin row exists (covers the case where the user signed up
  // before the DB was wired). Cheap upsert.
  await sql`
    INSERT INTO oglife_optins (oglife_user_id, email)
    VALUES (${sub}, ${email})
    ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
  `;

  const [balRow] = (await sql`
    SELECT COALESCE(SUM(rl.delta_tokens), 0)::int AS balance
      FROM rewards_ledger rl
      JOIN oglife_optins o ON o.id = rl.optin_id
     WHERE o.oglife_user_id = ${sub}
  `) as { balance: number }[];

  const scans = (await sql`
    SELECT
      s.token,
      s.scanned_at,
      p.slug AS product_slug,
      p.name AS product_name
    FROM qr_scans s
    JOIN oglife_optins o ON o.id = s.optin_id
    LEFT JOIN qr_tokens t ON t.token   = s.token
    LEFT JOIN batches   b ON b.id      = t.batch_id
    LEFT JOIN products  p ON p.id      = b.product_id
    WHERE o.oglife_user_id = ${sub}
    ORDER BY s.scanned_at DESC
    LIMIT 20
  `) as Scan[];

  const subscriptions = (await sql`
    SELECT pns.strain_slug, pns.product_slug, pns.channel
      FROM product_notification_subscribers pns
      JOIN oglife_optins o ON o.id = pns.optin_id
     WHERE o.oglife_user_id = ${sub} AND pns.is_active = true
     ORDER BY pns.subscribed_at DESC
  `) as Subscription[];

  return { balance: balRow.balance, scans, subscriptions, stub: false as const };
}

export default async function LoyaltyAccount() {
  const sessionCookie = (await cookies()).get("bm_session");
  if (!sessionCookie) {
    redirect("/api/auth/google?return_to=/loyalty/account");
  }
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/google?return_to=/loyalty/account");
  }

  const { balance, scans, subscriptions, stub } = await loadAccount(
    session.sub,
    session.email,
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="uppercase tracking-[0.25em] text-xs text-white/50">
            Your account
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mt-2">Loyalty</h1>
          <p className="mt-1 text-xs text-white/40">{session.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Point balance
          </p>
          <p className="text-3xl font-bold mt-1">{balance}</p>
          <Link
            href="/account/settings"
            className="mt-2 inline-block text-xs text-white/50 hover:text-white border-b border-white/20 hover:border-white pb-0.5"
          >
            Edit preferences →
          </Link>
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
                <li key={`${s.token}-${s.scanned_at}`} className="flex justify-between gap-3">
                  <span className="truncate">
                    {s.product_slug ? (
                      <Link
                        href={`/strains/${s.product_slug}`}
                        className="hover:text-white"
                      >
                        {s.product_name ?? s.product_slug}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{s.token}</span>
                    )}
                  </span>
                  <time className="text-white/40 whitespace-nowrap">
                    {new Date(s.scanned_at).toLocaleDateString()}
                  </time>
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
                  <span>{sub.strain_slug ?? sub.product_slug ?? "—"}</span>
                  <span className="text-white/40 uppercase tracking-wider text-xs">
                    {sub.channel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <div className="md:col-span-2">
          <Block title="Redeem points">
            <RedeemRewards balance={balance} />
          </Block>
        </div>
      </section>

      {stub && (
        <p className="px-6 md:px-16 max-w-4xl mx-auto pb-24 text-xs text-white/40 italic">
          DB not configured in this environment — showing empty state.
        </p>
      )}
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

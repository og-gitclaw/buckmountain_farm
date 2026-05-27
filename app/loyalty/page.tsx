/**
 * /loyalty — explainer + entry-point for the QR-sticker loyalty program.
 *
 * Visitors land here for two reasons:
 *   1. They scanned a sticker (those go directly to /loyalty/scan/[token]).
 *   2. They followed a "scan your jar to earn points" CTA from somewhere
 *      else on the site. This page tells them what to do next.
 */

import Link from "next/link";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

export const metadata = {
  title: "Loyalty — Buck Mountain Cannabis",
  description:
    "Scan the QR sticker under any Buck Mountain jar lid to verify authenticity and earn loyalty points toward monthly prize drops.",
};

export default function LoyaltyLanding() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          Authenticity + rewards
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Scan the jar.</h1>
        <p className="mt-4 text-lg text-white/75">
          Every Buck Mountain jar carries a one-of-one sticker under the lid.
          Scan it with your phone — we&rsquo;ll confirm it&rsquo;s real, log the
          batch, and credit your account toward our monthly prize drop.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-12 grid gap-4 md:grid-cols-3">
        <Step n="1" title="Open the camera">Point at the sticker under the lid.</Step>
        <Step n="2" title="Tap the link">Lands you on buckmountain.farm/loyalty/scan/&hellip;</Step>
        <Step n="3" title="Sign in once">Google sign-in (one tap). Stays signed in across scans.</Step>
      </section>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-24 space-y-4">
        <div className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">Monthly prize drops</h2>
          <p className="mt-2 text-white/70 text-sm">
            One winner per month gets a Buck Mountain prize pack (apparel + a
            jar of whatever just dropped). Every scan = one entry. Repeat
            buyers stack up fast.
          </p>
          <div className="mt-4">
            <PushSubscribeButton />
          </div>
        </div>
        <div className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold">Already signed up?</h2>
          <p className="mt-2 text-white/70 text-sm">
            See your scan history and current point balance.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            <Link
              href="/loyalty/account"
              className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold"
            >
              Open my account
            </Link>
            <Link
              href="/api/auth/google?return_to=/loyalty/account"
              className="rounded-md border border-white/20 px-4 py-2 text-sm"
            >
              Sign in with Google
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-3xl font-bold text-white/30">{n}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/65">{children}</p>
    </div>
  );
}

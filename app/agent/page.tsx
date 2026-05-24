/**
 * Agent portal landing — Buck Mountain's answer to new.BigMooseHemp.com.
 *
 * Audience: field reps + brand ambassadors who visit dispensaries
 * statewide. They need to:
 *   - Log in (Google SSO; same provider as the customer site)
 *   - See their assigned dispensaries on a map / list
 *   - Pull up an account: contact log, recent Nabis orders, last visit,
 *     last reorder, menu placement, jar QR-scan trail at that store
 *   - File a "contact report" after each visit
 *   - Trigger a new-product notification blast to that dispensary's
 *     buyer (via Alpine IQ — SMS + Web Push)
 *
 * Auth wall: this page is currently unauthenticated. Google SSO lands
 * via /api/auth/google (see app/api/auth/google/route.ts). Sessions are
 * cookie-based, 30-day rolling.
 *
 * TODO(P3): wire actual session check + redirect to /api/auth/google
 * when no session cookie present. For now this is a layout stub so the
 * route resolves and Brendon can preview the IA.
 */

import Link from "next/link";

export default function AgentHome() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-5xl mx-auto mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Field Agent Portal</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Buck Mountain · CA statewide · BMH-parity backend
          </p>
        </div>
        <Link
          href="/api/auth/google?return_to=/agent"
          className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200"
        >
          Sign in with Google
        </Link>
      </header>

      <section className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
        <Card
          href="/agent/dispensaries"
          title="Dispensaries"
          desc="Your assigned shops. Order status, contact log, last visit."
        />
        <Card
          href="/agent/orders"
          title="Nabis Orders"
          desc="Live Nabis pipeline. Sort by buyer, age, status."
        />
        <Card
          href="/agent/notifications"
          title="New Product Blast"
          desc="Push a new SKU drop to dispensary buyers via Alpine IQ."
        />
        <Card
          href="/agent/loyalty"
          title="Loyalty Scans"
          desc="QR jar scans by store. Which lids are hitting hardest."
        />
        <Card
          href="/agent/menu-placement"
          title="Menu Placement"
          desc="Where Buck is listed on each store's online menu. Audit + screenshot."
        />
        <Card
          href="/agent/visit-report"
          title="File Visit Report"
          desc="Fast form: store visited, who you talked to, action items."
        />
      </section>
    </main>
  );
}

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 hover:bg-neutral-900 transition"
    >
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-neutral-400 mt-2">{desc}</p>
    </Link>
  );
}

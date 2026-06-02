/**
 * /admin — admin landing. Quick-access tiles for the back-office work.
 *
 * Auth: relies on Vercel deployment protection until session checks are
 * wired. Super-admin-only tiles (lib/super-admin) only render for
 * mustwemuse@/bmdistributionllc@ — non-super-admins don't see the link.
 */

import Link from "next/link";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/super-admin";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/admin/assets", title: "Asset dashboard", desc: "Files ingested from openclaw." },
  { href: "/admin/strain-updates", title: "Post strain update", desc: "Compose for the homepage feed + optionally blast." },
  { href: "/admin/drops", title: "Add current drop", desc: "Manual drop entry (where to find strains right now)." },
  { href: "/admin/orders", title: "Nabis orders", desc: "Full pipeline across all dispensaries." },
  { href: "/admin/qr-sheets", title: "QR sheets", desc: "Ingested print sheets + token counts." },
  { href: "/admin/emails", title: "Outbound emails", desc: "SES transactional log + status + test send." },
  { href: "/agent", title: "Agent portal", desc: "BMH-parity field-rep view." },
];

const SUPER_ADMIN_TILES = [
  {
    href: "/admin/push-throttle",
    title: "Push fault injection",
    desc: "Arm synthetic 429/5xx for the next N Web Push sends — exercises the retry path end-to-end.",
  },
];

export default async function AdminHome() {
  const session = await getSession();
  const superAdmin = isSuperAdmin(session);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-neutral-400 text-sm mt-1">Back-office for buckmountain.farm.</p>
      </header>
      <section className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 hover:bg-neutral-900 transition"
          >
            <h2 className="font-semibold text-lg">{t.title}</h2>
            <p className="text-sm text-neutral-400 mt-2">{t.desc}</p>
          </Link>
        ))}
      </section>

      {superAdmin && (
        <section className="max-w-5xl mx-auto mt-10">
          <h2 className="text-xs uppercase tracking-[0.25em] text-rose-400/80 mb-3">
            Super-admin
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {SUPER_ADMIN_TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="block rounded-lg border border-rose-500/30 bg-rose-500/5 p-5 hover:bg-rose-500/10 transition"
              >
                <h3 className="font-semibold text-lg">{t.title}</h3>
                <p className="text-sm text-neutral-400 mt-2">{t.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

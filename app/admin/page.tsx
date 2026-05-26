/**
 * /admin — admin landing. Quick-access tiles for the back-office work.
 *
 * Auth: relies on Vercel deployment protection until session checks are
 * wired. P3 layers role=admin on top of session.
 */

import Link from "next/link";

const TILES = [
  { href: "/admin/assets", title: "Asset dashboard", desc: "Files ingested from openclaw." },
  { href: "/admin/strain-updates", title: "Post strain update", desc: "Compose for the homepage feed + optionally blast." },
  { href: "/admin/orders", title: "Nabis orders", desc: "Full pipeline across all dispensaries." },
  { href: "/admin/qr-sheets", title: "QR sheets", desc: "Ingested print sheets + token counts." },
  { href: "/admin/emails", title: "Outbound emails", desc: "SES transactional log + status + test send." },
  { href: "/agent", title: "Agent portal", desc: "BMH-parity field-rep view." },
];

export default function AdminHome() {
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
    </main>
  );
}

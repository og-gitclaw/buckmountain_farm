/**
 * /admin/strain-updates — compose a strain update for the homepage feed.
 *
 * Posts to /api/admin/strain-updates. Inserts a strain_updates row that
 * surfaces immediately on / and /strains/updates.
 *
 * Auth (P3): admin role required. For now Vercel auth wall is the gate.
 */

import Link from "next/link";
import { STRAINS } from "@/data/strains";

const KINDS = [
  { value: "new-drop", label: "New drop" },
  { value: "batch-update", label: "Batch update" },
  { value: "coming-soon", label: "Coming soon" },
  { value: "limited", label: "Limited run" },
];

export default function AdminStrainUpdates() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-32 pb-12 px-6 md:px-12 max-w-2xl mx-auto">
        <nav className="text-sm mb-4">
          <Link href="/admin" className="text-sky-400 hover:underline">
            ← Admin
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">Post strain update</h1>
        <p className="text-white/60 text-sm mt-1">
          Goes live on the homepage feed + /strains/updates the moment you submit.
        </p>

        <form
          method="POST"
          action="/api/admin/strain-updates"
          className="mt-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">Strain</label>
            <select
              name="strain_slug"
              required
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            >
              <option value="">Pick one…</option>
              {STRAINS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Kind</label>
            <select
              name="kind"
              required
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Headline</label>
            <input
              type="text"
              name="headline"
              required
              maxLength={140}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder="Permanent OG just landed"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Body</label>
            <textarea
              name="body"
              required
              rows={4}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder="Light-assist indoor, batch packaged today. COA pending; jars hit shelves next week."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="also_blast" defaultChecked />
            Also push new-product notification (Alpine IQ SMS + Web Push)
          </label>
          <button
            type="submit"
            className="rounded-md bg-white text-black px-5 py-3 font-semibold"
          >
            Post update
          </button>
        </form>
      </section>
    </main>
  );
}

/**
 * /admin/drops — add a drop manually.
 *
 * Most drops will land via the IG ingester. This form covers the cases
 * where: (a) a dispensary doesn't tag us on IG, (b) the rep wants to
 * highlight something before the ingester catches it, (c) backfilling
 * historic drops for SEO.
 */

import Link from "next/link";
import { STRAINS } from "@/data/strains";

const STATUSES = ["live", "low-stock", "sold-out", "incoming"] as const;
const SOURCE_KINDS = ["manual", "instagram", "weedmaps", "leafly", "nabis"] as const;

export default function AdminDropsCompose() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-32 pb-12 px-6 md:px-12 max-w-2xl mx-auto">
        <nav className="text-sm mb-4">
          <Link href="/admin" className="text-sky-400 hover:underline">
            ← Admin
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">Add current drop</h1>
        <p className="text-white/60 text-sm mt-1">
          Goes live on <code>/drops</code> + the homepage sidebar immediately.
        </p>

        <form
          method="POST"
          action="/api/admin/drops"
          className="mt-8 space-y-4"
        >
          <Row>
            <Field label="Strain" name="strain_slug" required>
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
            </Field>
            <Field label="Status" name="status" required>
              <select
                name="status"
                required
                defaultValue="live"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Dispensary name" name="dispensary_name" required>
              <input
                type="text"
                name="dispensary_name"
                required
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Dispensary ID (optional)" name="dispensary_id">
              <input
                type="text"
                name="dispensary_id"
                placeholder="sf-tha-hi"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
          </Row>

          <Row>
            <Field label="City" name="city">
              <input
                type="text"
                name="city"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="State" name="state">
              <input
                type="text"
                name="state"
                defaultValue="CA"
                maxLength={2}
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm uppercase"
              />
            </Field>
          </Row>

          <Field label="Caption" name="caption">
            <textarea
              name="caption"
              rows={3}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder="@dispensary just dropped a fresh tub of Permanent OG — call your account rep for placement."
            />
          </Field>

          <Row>
            <Field label="Source" name="source_kind">
              <select
                name="source_kind"
                defaultValue="manual"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              >
                {SOURCE_KINDS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source URL" name="source_url">
              <input
                type="url"
                name="source_url"
                placeholder="https://www.instagram.com/p/…"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
          </Row>

          <Row>
            <Field label="Source handle" name="source_handle">
              <input
                type="text"
                name="source_handle"
                placeholder="@dispensary"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Hero image URL" name="hero_image_url">
              <input
                type="url"
                name="hero_image_url"
                placeholder="https://…blob.vercel-storage.com/drops/…"
                className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
          </Row>

          <button
            type="submit"
            className="rounded-md bg-white text-black px-5 py-3 font-semibold"
          >
            Add drop
          </button>
        </form>
      </section>
    </main>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

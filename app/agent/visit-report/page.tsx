/**
 * /agent/visit-report — fast form an agent files after each dispensary visit.
 *
 * Pre-fills `dispensary` from the ?dispensary= query (deep-linked from
 * the dispensary detail page). Posts to /api/agent/visit-report.
 */

import Link from "next/link";

export default async function VisitReport({
  searchParams,
}: {
  searchParams: Promise<{ dispensary?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-32 pb-12 px-6 md:px-12 max-w-2xl mx-auto">
        <nav className="text-sm mb-4">
          <Link href="/agent" className="text-sky-400 hover:underline">
            ← Agent home
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">File visit report</h1>
        <p className="text-white/60 text-sm mt-1">
          Fast. Two minutes. Action items get pushed back to the dispensary
          detail page for the next visit.
        </p>

        <form
          method="POST"
          action="/api/agent/visit-report"
          className="mt-8 space-y-4"
        >
          <Field
            label="Dispensary ID"
            name="dispensary_id"
            defaultValue={sp.dispensary ?? ""}
            required
          />
          <Field label="Who you talked to" name="contact_name" />
          <div>
            <label className="block text-sm font-semibold mb-1">Summary</label>
            <textarea
              name="summary"
              rows={4}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder="They reordered Permanent OG, asked about rosin badder pricing, want to do a budtender training next month."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Action items (one per line)
            </label>
            <textarea
              name="action_items"
              rows={3}
              className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
              placeholder={`Send rosin pricing sheet\nSchedule budtender training\nDrop off Always Grinding tees x3`}
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-white text-black px-5 py-3 font-semibold"
          >
            Submit visit
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
      />
    </div>
  );
}

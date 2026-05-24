/**
 * /agent/notifications — fire a new-drop blast.
 *
 * Form posts to /api/notifications/new-product. Agent picks the strain,
 * writes a one-liner, and chooses an audience (default = all opted-in
 * Buck Mountain customers; or scope to a specific dispensary's buyer).
 */

import Link from "next/link";

export default function AgentNotifications() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <nav className="max-w-3xl mx-auto mb-4 text-sm">
        <Link href="/agent" className="text-sky-400 hover:underline">← Agent home</Link>
      </nav>
      <header className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Send new-product blast</h1>
        <p className="text-neutral-400 text-sm mt-1">
          SMS via Alpine IQ + Web Push to opted-in customers.
        </p>
      </header>

      <form
        className="max-w-3xl mx-auto space-y-4"
        method="POST"
        action="/api/notifications/new-product"
      >
        <Field label="Product slug" name="product_slug" placeholder="permanent-og" />
        <Field label="Headline" name="headline" placeholder="Permanent OG just landed" />
        <div>
          <label className="block text-sm font-semibold mb-1">Body</label>
          <textarea
            name="body"
            rows={3}
            className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            placeholder="Light-assist indoor, batch just dropped today. Check the menu near you."
          />
        </div>
        <Field label="CTA URL" name="cta_url" placeholder="/strains/permanent-og" />
        <Field label="Audience ID (optional)" name="audience_id" placeholder="(defaults to ALPINEIQ_DEFAULT_AUDIENCE_ID)" />
        <Field label="Dispensary filter (comma-separated, optional)" name="dispensary_filter" placeholder="" />

        <button
          type="submit"
          className="rounded-md bg-white text-black px-5 py-3 font-semibold"
        >
          Send blast
        </button>
        <p className="text-xs text-neutral-500">
          Requires <code>ADMIN_API_TOKEN</code> auth. The form currently posts unauthenticated —
          P3 wires the session-derived token automatically.
        </p>
      </form>
    </main>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
      />
    </div>
  );
}

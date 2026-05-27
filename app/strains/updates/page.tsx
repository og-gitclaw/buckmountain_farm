/**
 * /strains/updates — full feed of strain updates.
 *
 * Homepage shows the latest 3; this is the complete chronological feed.
 * Drives the "tell me when X drops" subscribe flow (TODO: wire to
 * product_notification_subscribers table).
 */

import { StrainUpdates } from "@/components/strain-updates";
import { loadStrainUpdates } from "@/lib/strain-updates";

// Live feed — short revalidate so new posts surface fast.
export const revalidate = 30;

export default async function StrainUpdatesFeed() {
  const updates = await loadStrainUpdates(40);
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 pt-20">
      <StrainUpdates updates={updates} />
      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-24">
        <div className="reveal-on-scroll rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-bold">Get pinged when something drops</h2>
          <p className="mt-2 text-white/70 text-sm">
            Pick a strain, pick a channel (SMS, push, email), get notified
            when the next batch packages. Honest cadence — no daily noise.
          </p>
          <form
            method="POST"
            action="/api/notifications/subscribe"
            className="mt-4 flex flex-wrap gap-2"
          >
            <input
              name="strain_slug"
              placeholder="strain slug (e.g. permanent-og)"
              className="flex-1 min-w-[200px] rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            />
            <select
              name="channel"
              defaultValue="push"
              className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
            >
              <option value="push">Push</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

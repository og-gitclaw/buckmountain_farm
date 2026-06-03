/**
 * /account/settings — customer-side consent + preference editing.
 *
 * Reads the signed-in user's oglife_optins.consents and renders the same
 * flags shown at /auth/consent, pre-filled with their current choices.
 * The form POSTs back to /api/auth/consent (which merge-upserts consents
 * via `consents || EXCLUDED.consents`), so unchecking a box flips it to
 * false on save. return_to brings the user back here with ?saved=1.
 *
 * Auth-gated + per-user, so it's force-dynamic (never prerendered).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Consents = {
  age_21_plus: boolean;
  cannabis_interest: boolean;
  oglife_network: boolean;
  marketing_email: boolean;
  marketing_sms: boolean;
  push_notifications: boolean;
  consented_at?: string;
};

const DEFAULTS: Consents = {
  age_21_plus: true,
  cannabis_interest: false,
  oglife_network: false,
  marketing_email: false,
  marketing_sms: false,
  push_notifications: false,
};

async function loadConsents(sub: string, email: string): Promise<Consents> {
  if (!dbConfigured()) return DEFAULTS;
  const sql = getSql();
  try {
    const rows = (await sql`
      SELECT consents
        FROM oglife_optins
       WHERE oglife_user_id = ${sub}
       LIMIT 1
    `) as { consents: Partial<Consents> | null }[];
    const stored = rows[0]?.consents ?? {};
    return { ...DEFAULTS, ...stored, age_21_plus: true };
  } catch {
    // If the optin row doesn't exist yet, seed one so the save merges cleanly.
    try {
      await sql`
        INSERT INTO oglife_optins (oglife_user_id, email)
        VALUES (${sub}, ${email})
        ON CONFLICT (oglife_user_id) DO NOTHING
      `;
    } catch {
      /* non-fatal */
    }
    return DEFAULTS;
  }
}

export default async function AccountSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sessionCookie = (await cookies()).get("bm_session");
  if (!sessionCookie) {
    redirect("/api/auth/google?return_to=/account/settings");
  }
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/google?return_to=/account/settings");
  }

  const sp = await searchParams;
  const consents = await loadConsents(session.sub, session.email);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-8 px-6 md:px-16 max-w-2xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          Your account
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mt-2">Preferences</h1>
        <p className="mt-1 text-xs text-white/40">{session.email}</p>

        {sp.saved && (
          <div className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
            Preferences saved.
          </div>
        )}

        <form
          method="POST"
          action="/api/auth/consent"
          className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-5"
        >
          <input
            type="hidden"
            name="return_to"
            value="/account/settings?saved=1"
          />

          <fieldset className="space-y-3">
            <Checkbox
              name="age_21_plus"
              label="I am 21 years of age or older"
              defaultChecked={consents.age_21_plus}
              required
            />
            <Checkbox
              name="cannabis_interest"
              label="I’m interested in cannabis products + content"
              defaultChecked={consents.cannabis_interest}
            />
            <Checkbox
              name="oglife_network"
              label="Link my account to the OG Life consent network"
              defaultChecked={consents.oglife_network}
            />
            <Checkbox
              name="marketing_email"
              label="Email me about new drops + Buck Mountain news (no spam)"
              defaultChecked={consents.marketing_email}
            />
            <Checkbox
              name="marketing_sms"
              label="Text me for monthly prize drawings + new-product alerts (Alpine IQ; reply STOP to opt out)"
              defaultChecked={consents.marketing_sms}
            />
            <Checkbox
              name="push_notifications"
              label="Allow browser push notifications"
              defaultChecked={consents.push_notifications}
            />
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-md bg-white text-black px-4 py-3 font-semibold hover:bg-neutral-200"
          >
            Save preferences
          </button>

          <p className="text-xs text-white/40">
            Unchecking marketing options opts you out immediately on save. See
            our{" "}
            <Link href="/privacy" className="underline hover:text-white">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="underline hover:text-white">
              terms
            </Link>
            .
          </p>
        </form>

        <p className="mt-6 text-sm">
          <Link href="/loyalty/account" className="text-white/60 hover:text-white">
            ← Back to your loyalty dashboard
          </Link>
        </p>
      </section>
    </main>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
  required,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        required={required}
        className="mt-1 h-4 w-4 accent-white"
      />
      <span className="text-sm">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
    </label>
  );
}

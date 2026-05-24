/**
 * /auth/consent — post-Google-SSO consent confirmation.
 *
 * The 21+ check, cannabis-interest, and OGLife consent-network boxes
 * are PRE-CHECKED per Brendon's directive. SMS marketing is OFF by
 * default (TCPA requires affirmative consent). User must click
 * "I agree" to save — we don't dark-pattern.
 *
 * POSTs to /api/auth/consent → writes oglife_optins.consents jsonb
 * and redirects to ?return_to= (defaults to /agent).
 */

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const sp = await searchParams;
  const returnTo = sp.return_to ?? "/agent";
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <form
        method="POST"
        action="/api/auth/consent"
        className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 space-y-6"
      >
        <header>
          <h1 className="text-2xl font-bold">One moment — confirm preferences</h1>
          <p className="text-sm text-neutral-400 mt-2">
            These defaults reflect the OG Life consent network. Uncheck anything
            you don&rsquo;t want. We never share without your say-so.
          </p>
        </header>

        <input type="hidden" name="return_to" value={returnTo} />

        <fieldset className="space-y-3">
          <Checkbox name="age_21_plus" label="I am 21 years of age or older" defaultChecked required />
          <Checkbox name="cannabis_interest" label="I&rsquo;m interested in cannabis products + content" defaultChecked />
          <Checkbox name="oglife_network" label="Link my account to the OG Life consent network" defaultChecked />
          <Checkbox name="marketing_email" label="Email me about new drops + Buck Mountain news (no spam)" />
          <Checkbox name="marketing_sms" label="Text me for monthly prize drawings + new-product alerts (Alpine IQ; reply STOP to opt out)" />
          <Checkbox name="push_notifications" label="Allow browser push notifications" />
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-white text-black px-4 py-3 font-semibold hover:bg-neutral-200"
        >
          I agree, continue
        </button>

        <p className="text-xs text-neutral-500">
          See our <a href="/privacy" className="underline">privacy policy</a> and{" "}
          <a href="/terms" className="underline">terms</a>. You can change these
          anytime in your account settings.
        </p>
      </form>
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

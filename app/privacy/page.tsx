export const metadata = {
  title: "Privacy Policy — Buck Mountain Cannabis",
  description: "How Buck Mountain Cannabis collects, uses, and protects your data.",
};

export default function Privacy() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-24 px-6 md:px-16 max-w-3xl mx-auto space-y-5 text-white/85 leading-relaxed">
        <h1 className="text-4xl md:text-6xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-white/40">Last updated: 2026-05-24</p>

        <Section title="What we collect">
          <ul className="list-disc pl-5 space-y-1 text-white/75 text-sm">
            <li>Your email + Google account ID, if you sign in</li>
            <li>QR scan events (token, time, hashed IP, coarse geo from headers)</li>
            <li>Your phone number, ONLY if you affirmatively opt into SMS</li>
            <li>Push subscription endpoints, ONLY if you affirmatively opt in</li>
            <li>Your consent flags (21+, cannabis interest, OG Life network)</li>
          </ul>
        </Section>

        <Section title="What we don&rsquo;t collect">
          <ul className="list-disc pl-5 space-y-1 text-white/75 text-sm">
            <li>Raw IP addresses (we hash them with a daily-rotating salt)</li>
            <li>Precise GPS coordinates</li>
            <li>Birthday, gender, payment data (we don&rsquo;t sell direct to consumers)</li>
            <li>Browsing history across other sites</li>
          </ul>
        </Section>

        <Section title="Who we share with">
          <p className="text-white/75 text-sm">
            Alpine IQ for SMS delivery. Google for OAuth identity. Nabis for
            wholesale order fulfillment. Vercel for hosting. Neon for the
            database. We do not sell your data. We do not share with advertisers.
          </p>
          <p className="text-white/75 text-sm mt-3">
            If you check the &ldquo;OG Life consent network&rdquo; box at sign-up, we
            mirror your basic profile (email hash + consent flags) to the OG
            Life cross-brand opt-in pool so the other brands you opted into
            don&rsquo;t have to re-ask. You can unlink anytime from{" "}
            <a href="/loyalty/account" className="underline hover:text-white">
              /loyalty/account
            </a>.
          </p>
        </Section>

        <Section title="SMS (TCPA)">
          <p className="text-white/75 text-sm">
            SMS marketing requires affirmative opt-in. Frequency capped at
            ~4 messages/month. Reply STOP at any time to opt out, HELP for
            help. Msg &amp; data rates may apply. Alpine IQ is our authorized
            sending platform.
          </p>
        </Section>

        <Section title="Cookies">
          <p className="text-white/75 text-sm">
            A single httpOnly session cookie (<code>bm_session</code>) holds
            your Google identity after sign-in. No third-party analytics
            cookies. No ad-targeting pixels.
          </p>
        </Section>

        <Section title="Your rights">
          <p className="text-white/75 text-sm">
            Email{" "}
            <a href="mailto:privacy@buckmountain.farm" className="underline hover:text-white">
              privacy@buckmountain.farm
            </a>{" "}
            to request access, correction, deletion, or export of your data.
            CCPA + GDPR-style requests honored within 30 days.
          </p>
        </Section>

        <p className="text-xs text-white/40 italic border-t border-white/10 pt-4">
          Plain-English summary, not legal copy. Final legal review pending —
          please don&rsquo;t treat as binding until a CA cannabis attorney signs off.
        </p>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-6">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

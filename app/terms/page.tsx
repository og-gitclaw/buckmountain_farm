export const metadata = {
  title: "Terms — Buck Mountain Cannabis",
  description: "Terms of use for the Buck Mountain Cannabis website + loyalty program.",
};

export default function Terms() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-24 px-6 md:px-16 max-w-3xl mx-auto space-y-5 text-white/85 leading-relaxed">
        <h1 className="text-4xl md:text-6xl font-bold">Terms</h1>
        <p className="text-sm text-white/40">Last updated: 2026-05-24</p>

        <Section title="21+">
          You must be 21 or older to use this site, scan a sticker, or
          participate in the loyalty program. By proceeding you certify you
          meet the age requirement.
        </Section>

        <Section title="Loyalty program">
          One QR scan per unique sticker = one rewards-ledger entry +
          one entry into the monthly prize drawing. Stickers are intended
          for the original purchaser of the jar. Sticker scans that look
          like counterfeit or scraped tokens may be voided.
        </Section>

        <Section title="Monthly prize drops">
          Winners drawn monthly from the pool of valid scans. Prizes vary
          (apparel + product). No purchase necessary — write us a postcard
          to enter without buying. Void where prohibited. Must be 21+ to win.
        </Section>

        <Section title="Wholesale">
          California licensed retailers only. License must be in good
          standing with CDPH/DCC. Orders fulfilled through Nabis distribution
          or direct hand-off in the Sierra foothills region.
        </Section>

        <Section title="No medical claims">
          Nothing on this site is a medical claim. Cannabis affects everyone
          differently. Consult your physician before use, especially if you
          are pregnant, nursing, on medication, or have a health condition.
        </Section>

        <Section title="Compliance">
          Buck Mountain Cannabis operates under California cannabis regulations.
          Product is intended for legal consumption by adults 21+ in California
          only. Do not transport across state lines.
        </Section>

        <p className="text-xs text-white/40 italic border-t border-white/10 pt-4">
          Plain-English summary, not legal copy. Final legal review pending.
        </p>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mt-6">{title}</h2>
      <p className="mt-3 text-white/75 text-sm">{children}</p>
    </div>
  );
}

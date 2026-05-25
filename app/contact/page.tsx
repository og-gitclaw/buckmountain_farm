export const metadata = {
  title: "Contact — Buck Mountain Cannabis",
  description: "Wholesale, press, partnerships, dispensary inquiries.",
};

export default function Contact() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">Get in touch</p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Contact</h1>
        <p className="mt-4 text-white/70">
          Sierra foothills, Nevada County, CA. Three ways to reach us.
        </p>
      </section>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pb-24 grid gap-4 md:grid-cols-3">
        <Card title="Wholesale + dispensary" lines={["wholesale@buckmountain.farm", "Or DM @buckmountaincannabis"]} />
        <Card title="Press + partnerships" lines={["press@buckmountain.farm"]} />
        <Card title="Anything else" lines={["hi@buckmountain.farm"]} />
      </section>

      <p className="px-6 md:px-16 max-w-3xl mx-auto pb-12 text-xs text-white/40 italic">
        Email lands in our Stalwart mailbox on Hetzner — see handoff/HETZNER_MAIL_SETUP.md.
        Replies come from a real human (no auto-responders).
      </p>
    </main>
  );
}

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-semibold">{title}</h2>
      {lines.map((l) => (
        <p key={l} className="mt-2 text-sm text-white/70">{l}</p>
      ))}
    </div>
  );
}

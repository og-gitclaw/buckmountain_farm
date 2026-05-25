export const metadata = {
  title: "About — Buck Mountain Cannabis",
  description:
    "A legacy cannabis brand in the Sierra foothills of Nevada County. Hybrid environments, hand-pulled light deps, hoop dreams.",
};

export default function About() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          A legacy farm
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">About</h1>
      </section>

      <article className="px-6 md:px-16 max-w-3xl mx-auto pb-24 space-y-5 text-white/85 leading-relaxed">
        <p>
          Buck Mountain Cannabis is a legacy cannabis brand based in the Sierra
          foothills of Nevada County, California. We grow across hybrid
          environments — hand-pulled light deps, mixed-light hoop houses, and
          indoor light-assist rooms — using a syngonic approach to plant
          nutrition.
        </p>
        <p>
          Our motto is &ldquo;always grinding for the highest quality.&rdquo; We
          treat every batch like it&rsquo;s our last. That shows up in the
          trim, in the cure, in the jar.
        </p>
        <p>
          The Buck Mountain rotation covers light-assist indoor flower, exotic
          indoor, badder-style concentrates, and our award-winning cold-pressed
          rosin vape. Each strain has a page at{" "}
          <a href="/strains" className="underline hover:text-white">
            /strains
          </a>
          .
        </p>
        <p>
          For wholesale + dispensary inquiries, hit{" "}
          <a href="/contact" className="underline hover:text-white">
            /contact
          </a>
          .
        </p>
      </article>
    </main>
  );
}

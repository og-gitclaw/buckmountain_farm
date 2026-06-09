import { VideoScene } from "@/components/video-scene";

export const metadata = {
  title: "Wholesale — Buck Mountain Cannabis",
  description:
    "Dispensary wholesale program. CA-licensed retailers — order through Nabis or contact wholesale@buckmountain.farm.",
};

export default function Wholesale() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-36 pb-12 px-6 md:px-16 max-w-3xl mx-auto">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          For licensed retailers
        </p>
        <h1 className="text-5xl md:text-7xl font-bold mt-2">Wholesale</h1>
        <p className="mt-4 text-white/70">
          Buck Mountain ships California-wide through Nabis distribution and
          direct hand-off in Nevada County / Sacramento corridor.
        </p>
      </section>

      {/* Outdoor cultivation showcase — moved here from the homepage so
          buyers landing on /wholesale see the operation before the
          ordering blocks. */}
      <VideoScene
        src="/assets/video/hero-c-flower.mp4"
        poster="/assets/video/hero-c-flower-poster.jpg"
        align="center"
        overlayOpacity={0.4}
      >
        <h2 className="text-4xl md:text-7xl font-bold uppercase tracking-wider">
          Outdoor<br />Hoop Dreams
        </h2>
        <p className="mt-4 text-lg text-white/85 max-w-xl mx-auto">
          Bringing a new level of quality to outdoor growing.
        </p>
      </VideoScene>

      <section className="px-6 md:px-16 max-w-3xl mx-auto pt-12 pb-12 space-y-4">
        <Block title="Ordering through Nabis">
          We&rsquo;re live on Nabis as <strong>Buck Mountain Cannabis</strong>.
          If you&rsquo;re already on Nabis, request the menu from your account.
          If you&rsquo;re not on Nabis, email{" "}
          <a href="mailto:wholesale@buckmountain.farm" className="underline hover:text-white">
            wholesale@buckmountain.farm
          </a>{" "}
          and we&rsquo;ll get you set up — or arrange direct.
        </Block>
        <Block title="What we carry">
          Light-assist indoor flower, exotic indoor flower, badder concentrates,
          cold-pressed rosin vape. Rotation visible at{" "}
          <a href="/strains" className="underline hover:text-white">/strains</a>.
        </Block>
        <Block title="Sample request">
          Sample jars + COA packets for first-time buyers — email{" "}
          <a href="mailto:wholesale@buckmountain.farm" className="underline hover:text-white">
            wholesale@buckmountain.farm
          </a>{" "}
          with your license # + delivery address.
        </Block>
        <Block title="New-product alerts for buyers">
          Subscribe at{" "}
          <a href="/strains/updates" className="underline hover:text-white">/strains/updates</a>
          {" "}— pick the strains you want pinged on, get an SMS or push the
          moment a new batch packages.
        </Block>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-white/75">{children}</p>
    </div>
  );
}

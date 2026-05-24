import { ParallaxBackdrops } from "@/components/parallax-backdrops";
import { VideoParallaxHero } from "@/components/video-parallax-hero";

/**
 * Homepage — replicates the buckmountaincannabis.com vibe:
 *   - Hero: looping video with slow-scroll parallax (matches the original)
 *   - Below: 5 image backdrops that crossfade behind the long-scroll
 *     sections (Hybrid Environments → Hoop Dreams → Cultivation → FAQ)
 *
 * Per project rule (prefers-reduced-motion + sensory-friendly safeguards),
 * parallax disables itself when the OS reports reduced-motion preference,
 * and the hero video pauses when offscreen.
 *
 * Asset state: video + backdrops are TEMP placeholders until the Chrome
 * MCP rip lands real captures. See handoff/CHROME_MCP_RIP_PLAYBOOK.md.
 */
export default function Home() {
  return (
    <main className="relative">
      <VideoParallaxHero
        src="/assets/video/hero.mp4"
        poster="/assets/video/hero-poster.jpg"
      >
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Buck Mountain Cannabis
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80">
            Legacy cannabis brand in the Sierra foothills of Nevada County, CA.
          </p>
        </div>
      </VideoParallaxHero>

      <ParallaxBackdrops
        images={[
          { src: "/assets/backdrops/01-hybrid.jpg", caption: "Hybrid Environments" },
          { src: "/assets/backdrops/02-hoop.jpg", caption: "Outdoor Hoop Dreams" },
          { src: "/assets/backdrops/03-cultivation.jpg", caption: "Cultivation" },
          { src: "/assets/backdrops/04-jars.jpg", caption: "Glass" },
          { src: "/assets/backdrops/05-skate.jpg", caption: "Always Grinding" },
        ]}
      />

      <section className="relative z-10 min-h-screen flex items-center p-8 md:p-16">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-bold">Hybrid Environments</h2>
          <p className="mt-4 text-white/80">
            From full-organic hand-pulled light deps to mixed-light outdoor space ships,
            we utilize the best of both worlds with our syngonic approach to plant nutrition
            and our mixture of full-sunlight and HPS lighting.
          </p>
        </div>
      </section>

      <section className="relative z-10 min-h-screen flex items-center justify-center p-8 md:p-16 text-center">
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-wider">
            Outdoor<br />Hoop Dreams
          </h2>
          <p className="mt-4 text-white/80">Bringing a new level of quality to outdoor growing.</p>
        </div>
      </section>

      <section className="relative z-10 min-h-screen flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {[
              { q: "Where is Buck Mountain Cannabis located?", a: "Nevada County, California — the Sierra foothills." },
              { q: "How does Buck Mountain Cannabis grow their flower?", a: "Hybrid environments: hand-pulled light deps, mixed-light hoop houses, and indoor light-assist rooms." },
              { q: "Is Buck Mountain Cannabis organic?", a: "Our full-organic light deps are grown with a syngonic approach to plant nutrition. Other lines vary — see the strain page for batch-specific notes." },
              { q: "What is light dep cannabis?", a: "Light deprivation: blacking out a hoop house to manipulate the plant's photoperiod, triggering flowering on a schedule. Yields outdoor-quality buds with grower-controlled timing." },
            ].map((item) => (
              <li key={item.q} className="py-6">
                <details>
                  <summary className="cursor-pointer font-semibold text-lg flex items-center justify-between">
                    {item.q}
                    <span className="text-2xl opacity-60">+</span>
                  </summary>
                  <p className="mt-3 text-white/70">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="relative z-10 p-8 md:p-16 text-sm text-white/50">
        © Buck Mountain Cannabis · Nevada County, California ·{" "}
        <a href="/products" className="underline hover:text-white">Products</a> ·{" "}
        <a href="/blog" className="underline hover:text-white">Blog</a> ·{" "}
        <a href="/loyalty" className="underline hover:text-white">Loyalty</a>
      </footer>
    </main>
  );
}

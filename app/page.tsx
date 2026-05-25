import { ParallaxBackdrops } from "@/components/parallax-backdrops";
import { VideoParallaxHero } from "@/components/video-parallax-hero";
import { VideoScene } from "@/components/video-scene";
import { StrainUpdates, PLACEHOLDER_UPDATES } from "@/components/strain-updates";

/**
 * Homepage — visual flow:
 *
 *   1. Hero            — aerial-establish loop (hero-a, 5.5s)
 *   2. Strain Updates  — cards
 *   3. Hybrid Env.     — interior HPS loop (hero-b, 5s) behind copy
 *   4. Hoop Dreams     — outdoor flower loop (hero-c, 5.7s) behind copy, center-aligned
 *   5. Cultivation     — Sierra-foothills aerial loop (hero-d, 7.3s) behind copy
 *   6. Parallax tail   — 3 static backdrops as a slow contemplative scroll
 *                        (the other 2 backdrops moved to /about gallery)
 *   7. FAQ             — overlaid on the parallax tail
 *   8. Footer
 *
 * Background on why this changed from the 2026-05-24 placeholder:
 *   - The original hero.mp4 (57s, 19MB) was the entire legacy montage. The
 *     IntersectionObserver-paused loop played all of it at the top of the
 *     page, way overweight for a hero. Scene-detected 27 cuts → spliced
 *     into 4 thematic 5-7s loops via ffmpeg (see commit log + handoff/asset-manifest.md).
 *   - ParallaxBackdrops was fixed-positioned at z-0 starting at scrollY=0,
 *     causing backdrop[0] (purple cannabis flower) to bleed THROUGH the
 *     hero video. Now uses startOffset to defer activation until after the
 *     video sections.
 *
 * Mobile-2026 effects still in play:
 *   - Video parallax hero (scroll-decoupled, IO-paused)
 *   - reveal-on-scroll on strain-update cards
 *   - View Transitions on internal nav clicks
 *   - prefers-reduced-motion safe everywhere
 */
export default function Home() {
  return (
    <main className="relative">
      <VideoParallaxHero
        src="/assets/video/hero-a-establish.mp4"
        poster="/assets/video/hero-a-establish-poster.jpg"
      >
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Buck Mountain Cannabis
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80">
            A legacy cannabis brand in the Sierra foothills of Nevada County, Ca.
          </p>
        </div>
      </VideoParallaxHero>

      <StrainUpdates updates={PLACEHOLDER_UPDATES} />

      <VideoScene
        src="/assets/video/hero-b-interior.mp4"
        poster="/assets/video/hero-b-interior-poster.jpg"
        align="left"
      >
        <p className="uppercase tracking-[0.25em] text-xs text-white/60">
          Inside the grow
        </p>
        <h2 className="text-4xl md:text-6xl font-bold mt-2">
          Hybrid Environments
        </h2>
        <p className="mt-4 text-lg text-white/85 max-w-xl">
          From full-organic hand-pulled light deps to mixed-light outdoor space
          ships, we utilize the best of both worlds — a syngonic approach to
          plant nutrition and a mixture of full sunlight and HPS lighting.
        </p>
      </VideoScene>

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

      <VideoScene
        src="/assets/video/hero-d-foothills.mp4"
        poster="/assets/video/hero-d-foothills-poster.jpg"
        align="left"
        overlayOpacity={0.5}
      >
        <p className="uppercase tracking-[0.25em] text-xs text-white/60">
          Sierra Foothills, Nevada County
        </p>
        <h2 className="text-4xl md:text-6xl font-bold mt-2">
          A Legacy Cultivation Story
        </h2>
        <p className="mt-4 text-lg text-white/85 max-w-xl">
          Built on a generation of work in the foothills — light dep timing,
          batch-by-batch trim &amp; cure, no two harvests treated the same.
        </p>
      </VideoScene>

      {/* Slow contemplative still-image scroll. Starts ~5 viewport-heights in
          (hero + StrainUpdates + 3 VideoScenes) so it doesn't crash into the
          video sections. The other 2 backdrops (01-hybrid, 04-jars) live on
          the /about gallery to avoid stuffing the homepage. */}
      <ParallaxBackdrops
        startOffset={5}
        images={[
          { src: "/assets/backdrops/02-hoop.jpg", caption: "Outdoor Hoop Dreams" },
          { src: "/assets/backdrops/03-cultivation.jpg", caption: "Cultivation" },
          { src: "/assets/backdrops/05-skate.jpg", caption: "Always Grinding" },
        ]}
      />

      <section className="relative z-10 min-h-screen flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-3xl mx-auto reveal-on-scroll">
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
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <span>© Buck Mountain Cannabis · Nevada County, California</span>
          <a href="/strains" className="underline hover:text-white">Strains</a>
          <a href="/store" className="underline hover:text-white">Store</a>
          <a href="/blog" className="underline hover:text-white">Blog</a>
          <a href="/loyalty" className="underline hover:text-white">Loyalty</a>
          <a href="/wholesale" className="underline hover:text-white">Wholesale</a>
          <a href="/coa" className="underline hover:text-white">COA</a>
          <a href="/about" className="underline hover:text-white">About</a>
          <a href="/contact" className="underline hover:text-white">Contact</a>
          <a href="/privacy" className="underline hover:text-white">Privacy</a>
          <a href="/terms" className="underline hover:text-white">Terms</a>
          <a
            href="https://www.instagram.com/buckmountaincannabis/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            @buckmountaincannabis
          </a>
        </div>
        <p className="max-w-6xl mx-auto mt-4 text-xs text-white/30 italic">
          Always grinding for the highest quality. Treating every batch like it&rsquo;s our last.
        </p>
      </footer>
    </main>
  );
}

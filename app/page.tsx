import { ParallaxBackdrops } from "@/components/parallax-backdrops";
import { VideoParallaxHero } from "@/components/video-parallax-hero";
import { VideoScene } from "@/components/video-scene";
import { ScrollScrubbedVideo } from "@/components/scroll-scrubbed-video";
import { AuroraMesh } from "@/components/aurora-mesh";
import { BentoStrainGrid } from "@/components/bento-strain-grid";
import { MagneticButton } from "@/components/magnetic-button";
import { StrainUpdates } from "@/components/strain-updates";
import { FxStatusIndicator } from "@/components/fx-status-indicator";
import { loadStrainUpdates } from "@/lib/strain-updates";
import { parseFxFlags } from "@/lib/homepage-fx";

/**
 * Homepage — currently in DIAGNOSTIC MODE.
 *
 * The hero video is always on. Every other background / parallax / video
 * layer is gated behind an `fx` query-param flag (lib/homepage-fx.ts) so
 * each one can be added back individually to isolate which layer is
 * producing the "background videos playing under pictures / phantom
 * multimedia" the user reported.
 *
 * Default URL = clean baseline (only hero).
 * /?fx=strain-bg = adds just the flower-bud parallax behind the cards.
 * /?fx=strain-bg,interior = adds two.
 * /?fx=all = legacy behavior (everything on).
 *
 * The corner pill (FxStatusIndicator) shows which flags are currently
 * active and lets you toggle each by clicking. Remove the gating + that
 * indicator together once the investigation finishes.
 */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fx?: string | string[] }>;
}) {
  const { fx } = await searchParams;
  const flags = parseFxFlags(fx);
  const updates = await loadStrainUpdates(6);

  return (
    <main className="relative bg-neutral-950">
      <FxStatusIndicator flags={flags} />

      {/* 1. Hero — ALWAYS ON. The user's stated baseline. */}
      <VideoParallaxHero
        src="/assets/video/hero-a-establish.mp4"
        poster="/assets/video/hero-a-establish-poster.jpg"
      >
        <div className="max-w-2xl">
          <p className="uppercase tracking-[0.3em] text-[11px] text-white/70 mb-3">
            Sierra Foothills · Nevada County
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-brand-gradient">
            Buck Mountain Cannabis
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80 max-w-xl">
            A legacy cannabis brand. Hybrid environments, hand-pulled light
            deps, hoop dreams.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <MagneticButton href="/strains" className="cta-pill">
              See the rotation <span data-arrow aria-hidden>→</span>
            </MagneticButton>
            <MagneticButton href="/loyalty" className="cta-pill-ghost" pull={0.22}>
              Scan a jar
            </MagneticButton>
          </div>
        </div>
      </VideoParallaxHero>

      {/* 2. Chapter divider — always on (just text). */}
      <div className="px-6 md:px-16 py-12 max-w-6xl mx-auto">
        <div className="chapter-divider">Chapter I · Always Grinding</div>
      </div>

      {/* 3. Strain Updates — cards always render. The flower-bud parallax
          behind them is gated by `strain-bg`. */}
      <StrainUpdates updates={updates} showBackdrop={flags["strain-bg"]} />

      {/* 4. Scroll-scrubbed cultivation b-roll — entire section gated. */}
      {flags.interior && (
        <ScrollScrubbedVideo
          src="/assets/video/hero-b-interior.mp4"
          poster="/assets/video/hero-b-interior-poster.jpg"
          lengthInVh={3.5}
          overlayOpacity={0.32}
        >
          <div className="reveal-stagger">
            <p className="reveal-stagger-item uppercase tracking-[0.3em] text-xs text-white/60">
              Scroll to play
            </p>
            <h2 className="reveal-stagger-item text-4xl md:text-6xl font-bold mt-3 max-w-2xl">
              Inside the room.
            </h2>
            <p className="reveal-stagger-item mt-4 text-lg text-white/85 max-w-xl">
              Light-assist indoor, daily walk-through. The cut keeps when the
              room keeps. Tighter day-night swing, slower cure, less stress on
              the plant.
            </p>
          </div>
        </ScrollScrubbedVideo>
      )}

      {/* 5a. VideoScene Hoop Dreams — entire section gated. */}
      {flags.hoop && (
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
      )}

      {/* 5b. VideoScene Foothills — entire section gated. */}
      {flags.foothills && (
        <VideoScene
          src="/assets/video/hero-d-foothills.mp4"
          poster="/assets/video/hero-d-foothills-poster.jpg"
          align="left"
          overlayOpacity={0.42}
        >
          <p className="uppercase tracking-[0.3em] text-xs text-white/60">
            Sierra Foothills, Nevada County
          </p>
          <h2 className="text-4xl md:text-6xl font-bold mt-2">
            A Legacy Cultivation Story
          </h2>
          <p className="mt-4 text-lg text-white/85 max-w-xl">
            Built on a generation of work in the foothills — light-dep timing,
            batch-by-batch trim &amp; cure, no two harvests treated the same.
          </p>
        </VideoScene>
      )}

      {/* 6. Bento grid — gated. The tiles' placeholder gradient backgrounds
          are part of the suspect "phantom multimedia" surface, so the whole
          section is off in baseline. */}
      {flags.bento && <BentoStrainGrid />}

      {/* 7. Aurora + ParallaxBackdrops + FAQ. FAQ content always renders;
          its two background layers are independently gated so we can tell
          which one is the source of the "background under pictures" glitch. */}
      <section className="relative isolate bg-neutral-950">
        {flags.aurora && <AuroraMesh intensity={0.55} />}
        {flags["parallax-bg"] && (
          <ParallaxBackdrops
            startOffset={1}
            overlayOpacity={0.45}
            images={[
              { src: "/assets/backdrops/02-hoop.jpg", caption: "Outdoor Hoop Dreams" },
              { src: "/assets/backdrops/03-cultivation.jpg", caption: "Cultivation" },
              { src: "/assets/backdrops/05-skate.jpg", caption: "Always Grinding" },
            ]}
          />
        )}

        <div className="relative z-10 min-h-screen flex flex-col justify-center p-8 md:p-16">
          <div className="max-w-3xl mx-auto reveal-on-scroll">
            <div className="chapter-divider mb-8">Chapter II · Questions</div>
            <h2 className="text-4xl md:text-6xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <ul className="reveal-stagger divide-y divide-white/10 border-y border-white/10">
              {[
                { q: "Where is Buck Mountain Cannabis located?", a: "Nevada County, California — the Sierra foothills." },
                { q: "How does Buck Mountain Cannabis grow their flower?", a: "Hybrid environments: hand-pulled light deps, mixed-light hoop houses, and indoor light-assist rooms." },
                { q: "Is Buck Mountain Cannabis organic?", a: "Our full-organic light deps are grown with a syngonic approach to plant nutrition. Other lines vary — see the strain page for batch-specific notes." },
                { q: "What is light dep cannabis?", a: "Light deprivation: blacking out a hoop house to manipulate the plant's photoperiod, triggering flowering on a schedule. Yields outdoor-quality buds with grower-controlled timing." },
              ].map((item) => (
                <li key={item.q} className="reveal-stagger-item py-6">
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
        </div>
      </section>

      {/* 8. Footer — always on. */}
      <footer className="relative z-10 p-8 md:p-16 text-sm text-white/50">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <span>© Buck Mountain Cannabis · Nevada County, California</span>
          <a href="/strains" className="link-underline hover:text-white">Strains</a>
          <a href="/drops"   className="link-underline hover:text-white">Drops</a>
          <a href="/store"   className="link-underline hover:text-white">Store</a>
          <a href="/blog"    className="link-underline hover:text-white">Blog</a>
          <a href="/loyalty" className="link-underline hover:text-white">Loyalty</a>
          <a href="/wholesale" className="link-underline hover:text-white">Wholesale</a>
          <a href="/coa"     className="link-underline hover:text-white">COA</a>
          <a href="/about"   className="link-underline hover:text-white">About</a>
          <a href="/contact" className="link-underline hover:text-white">Contact</a>
          <a href="/privacy" className="link-underline hover:text-white">Privacy</a>
          <a href="/terms"   className="link-underline hover:text-white">Terms</a>
          <a
            href="https://www.instagram.com/buckmountaincannabis/"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline hover:text-white"
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

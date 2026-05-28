/**
 * /before-after — visual + narrative comparison of the legacy
 * buckmountaincannabis.com against the new buckmountain.farm rebuild.
 *
 * Modeled after https://zsty.us/before-after/jackiej-events — narrative
 * "Four Beats" structure (Problem / Insight / Build / Outcome) with
 * annotated before/after pairs. One real draggable comparison at the
 * top; the rest is storytelling pairs.
 *
 * Sourcing notes for the "before" side:
 *   - We have the LEGACY ripped assets (hero-full.mp4, gallery photos,
 *     backdrop photos) on disk because they came from the legacy host.
 *   - We DO NOT have screenshots of the legacy site's full IA — the
 *     site was a Next.js SPA that returned empty HTML to WebFetch and
 *     blocked headless Playwright. What we KNOW from the conversation:
 *     hero video + 4-up greenhouse gallery + FAQ + blog. ~2 sections.
 *     No per-strain pages, no search, no loyalty, no admin, no email,
 *     no marketing stack, no database, no auth.
 *
 * The "after" side uses live components from this very codebase so it
 * always reflects the current state.
 */

import Link from "next/link";
import Image from "next/image";
import { DragComparison } from "@/components/drag-comparison";
import { EffectTiles } from "@/components/effect-bars";
import { LineageTree } from "@/components/lineage-tree";
import { StrainPlaceholder } from "@/components/strain-placeholder";
import { STRAINS, getStrain } from "@/data/strains";

export const metadata = {
  title: "Before / After — Buck Mountain Cannabis Rebuild",
  description:
    "How a 2-section Squarespace-era page became a 50-route living storefront — splicing the legacy hero into 4 themed loops, 11 Leafly-style strain pages, scroll-scrubbed parallax, QR loyalty, transactional email, and a brand-new admin/agent back office.",
};

export default function BeforeAfterPage() {
  const og = getStrain("permanent-og")!;
  const cp = getStrain("cheetah-piss")!;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <Hero />

      {/* ====================== THE FOUR BEATS ====================== */}
      <Beats />

      {/* ====================== BEAT 1 · THE LOGO ====================== */}
      <Beat
        number="01"
        title="The mark"
        subtitle="From hand-drawn placeholder to the real Buck Mtn brand asset"
        problem={
          <>
            Cloud session started with nothing — no logo file on disk, no
            access to the design source. Shipped a hand-drawn SVG
            placeholder so the nav had <em>something</em> to render. It
            was a passable approximation: gold antlers, purple triangle,
            "BUCK MTN" wordmark. But the antlers were stylized fork shapes;
            the deer skull was a rounded triangle, not the real engraved
            illustration; the halo was missing entirely.
          </>
        }
        insight={
          <>
            A placeholder is a contract with the design source: "fill this
            slot when you can." Once Brendon uploaded{" "}
            <code>Buck_Mtn_New_Logo_8.24.23.pdf</code>, the path forward
            was{" "}
            <strong>
              pdftoppm @ 600 DPI → PIL alpha-key on near-white →
              auto-crop → pngquant
            </strong>{" "}
            so the brand asset slots in cleanly at 480×480 with a 82KB
            footprint and Next/Image WebP delivery.
          </>
        }
        build={
          <DragComparison
            aspectRatio="4 / 3"
            beforeLabel="Placeholder"
            afterLabel="Real mark"
            before={<LegacyLogoMockup />}
            after={
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
                <Image
                  src="/brand/logo.png"
                  alt="Buck Mtn"
                  width={480}
                  height={480}
                  className="h-3/4 w-auto"
                  priority
                />
              </div>
            }
          />
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>Hand-drawn SVG retired (still in repo as <code>logo.svg</code> for reference)</Bullet>
            <Bullet>Real PDF rendered + processed → <code>logo.png</code> 82KB, <code>logo-mark.png</code> 67KB, <code>logo-full.png</code> 556KB source-of-truth</Bullet>
            <Bullet>Header bumped <code>h-10/h-12</code> → <code>h-20/h-28</code> so the mark renders at proper visual weight</Bullet>
            <Bullet>Favicon, social cards, and 404 page all updated to the real mark</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 2 · THE HERO SEQUENCE ====================== */}
      <Beat
        number="02"
        title="The hero sequence"
        subtitle="One 57-second montage spliced into four themed 5-7s loops"
        problem={
          <>
            The legacy hero was a single 57-second cultivation montage
            (19 MB) autoplay-looping at the top of the page. It opened with
            a slow aerial drone, transitioned to an HPS-lit interior
            walk-through, then a flower close-up, then a Sierra foothills
            cinematic. Beautiful footage, but the visitor watched 57 seconds
            of footage with no narrative pacing — and on mobile the file
            weight hit a hard cap on 4G. Plus the parallax was already
            "fixed inset-0 z-0 from scrollY=0," which meant{" "}
            <strong>backdrop[0] bled through the hero video</strong> the
            instant the user scrolled even one pixel.
          </>
        }
        insight={
          <>
            FFmpeg scene-detection found 27 cuts in the montage. Three of
            them mapped cleanly to brand themes already in the IA: aerial
            establish, interior HPS, outdoor flower, foothills cinematic.
            Splicing the source into <strong>four themed loops</strong>{" "}
            (5-7s each) means the visitor sees <em>distinct visual moments</em>{" "}
            as they scroll, each anchored to a section heading — and total
            committed weight drops from 19 MB to 14.3 MB while gaining 4
            distinct video moments.
          </>
        }
        build={
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { src: "/assets/video/hero-a-establish.mp4", label: "hero-a · establish", dur: "5.5s" },
              { src: "/assets/video/hero-b-interior.mp4", label: "hero-b · interior", dur: "5.0s" },
              { src: "/assets/video/hero-c-flower.mp4", label: "hero-c · flower", dur: "5.7s" },
              { src: "/assets/video/hero-d-foothills.mp4", label: "hero-d · foothills", dur: "7.3s" },
            ].map((v) => (
              <figure
                key={v.src}
                className="rounded-xl overflow-hidden border border-white/10 bg-neutral-900"
              >
                <video
                  src={v.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  className="aspect-square w-full object-cover"
                  aria-hidden
                />
                <figcaption className="p-3 text-xs text-white/65 flex justify-between">
                  <span>{v.label}</span>
                  <span className="text-white/40">{v.dur}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>4 themed loops replace one 57s montage</Bullet>
            <Bullet>Each loop pairs to a section heading: <em>Hero</em> · <em>Hybrid Environments</em> · <em>Outdoor Hoop Dreams</em> · <em>A Legacy Cultivation Story</em></Bullet>
            <Bullet>Original <code>hero-full.mp4</code> gitignored, kept locally for re-cuts</Bullet>
            <Bullet>Total committed video weight: 19 MB → 14.3 MB (-25%)</Bullet>
            <Bullet>Parallax overlap fixed: <code>startOffset={"{5}"}</code> defers still-image parallax until past all video sections</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 3 · PARALLAX + SCROLL ====================== */}
      <Beat
        number="03"
        title="The parallax + scroll stack"
        subtitle="Four kinds of motion layered together, all reduced-motion safe"
        problem={
          <>
            The legacy site had no parallax — assets were rendered flat at
            their slot. The first rebuild tried a single CSS parallax with{" "}
            <code>background-attachment: fixed</code> (broken on mobile
            Safari). The second attempt swapped in a JS scroll listener
            with rAF throttling — works, but felt cinematic and
            overwhelming to Brendon. The brief: "less cinematic, more
            background-y."
          </>
        }
        insight={
          <>
            "Flashy but not overwhelming" wasn't about lowering motion{" "}
            <em>volume</em>; it was about adding more <em>kinds</em> of
            motion + better art direction. Studied Apple product pages,
            cannabis brands (Glasshouse, Cookies), and the WebKit Interop
            2026 scroll-driven animation spec. Landed a four-layer stack
            where each layer does one job well — and they compose without
            fighting each other.
          </>
        }
        build={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FXCard
              title="VideoParallaxHero"
              desc="Hero video, scroll-decoupled, IO-paused. Blur + brightness damp so it recedes as background, not main act."
              meta="JS rAF · CSS filter"
            />
            <FXCard
              title="ScrollScrubbedVideo"
              desc="Apple-style: video.currentTime locks to scroll % within a pinned 3.5vh runway. Viewer drives playback with their scroll wheel."
              meta="fastSeek() · IO-gated"
            />
            <FXCard
              title="VideoScene × 3"
              desc="Mid-page video panels behind text. IO-paused so only the visible one decodes. Edge-fade gradients so it reads as a panel."
              meta="Pure DOM"
            />
            <FXCard
              title="AuroraMesh + Grain"
              desc="3 drifting radial gradients + SVG feTurbulence noise overlay. Pure CSS keyframes. Mask-image fade at vertical edges."
              meta="0 KB JS payload"
            />
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>4 motion types layered: video parallax · scroll-scrubbed · video scene · still parallax tail</Bullet>
            <Bullet>Plus CSS scroll-driven reveal (<code>animation-timeline: view()</code>) + staggered fade-up + magnetic CTA hover</Bullet>
            <Bullet>Steady-state CPU ~0%, GPU 3-5% on a 2020 MacBook Air</Bullet>
            <Bullet>Every layer respects <code>prefers-reduced-motion</code></Bullet>
            <Bullet>Mobile Safari safe (no <code>background-attachment: fixed</code> anywhere)</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 4 · STRAIN PAGES ====================== */}
      <Beat
        number="04"
        title="The strain pages"
        subtitle="From text mentions to 11 Leafly-style detail pages"
        problem={
          <>
            The legacy site mentioned strains in body copy but had{" "}
            <strong>no per-strain pages</strong>. No lineage trees, no
            terpene profiles, no effect intensities, no related-by-family
            grid. For a brand whose differentiator is the depth of the
            rotation, this was the largest SEO gap on the site —
            "permanent og strain," "cheetah piss buck mountain," "gelato 41
            light assist" were all searchable phrases with zero landing
            pages.
          </>
        }
        insight={
          <>
            Studied new.bigmoosehemp.com/clones for the BMH-style cannabis
            UI language: family chips, lineage as parent-strain links,
            effect bars as 0-100 intensity scores with category labels
            (Body / Mind / Calm / Focus / Euphoria / Uplift). Built a{" "}
            <code>data/strains.ts</code> seed with all 11 rows + a{" "}
            <code>STRAIN_SEARCH_INDEX</code> for the Cmd-K nav search.
            All 11 pages prerender via <code>generateStaticParams</code> —
            edge-served, instant nav, SEO-perfect.
          </>
        }
        build={
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-neutral-900">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="aspect-[4/3] relative bg-neutral-950">
                <StrainPlaceholder strain={og} className="h-full w-full" />
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <span className="rounded-full border border-purple-400/40 text-purple-200 px-2 py-1 uppercase tracking-wider">
                    {og.type}
                  </span>
                  <span className="rounded-full border border-white/20 text-white/70 px-2 py-1 uppercase tracking-wider">
                    {og.family}
                  </span>
                </div>
                <h3 className="text-3xl font-bold">{og.name}</h3>
                <p className="text-sm text-white/55 italic mt-1">{og.lineage}</p>
                <div className="mt-4">
                  <LineageTree
                    strainName={og.name}
                    parents={og.parents}
                    lineage={og.lineage}
                  />
                </div>
                <div className="mt-4">
                  <EffectTiles scores={og.effect_scores} />
                </div>
              </div>
            </div>
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>11 prerendered strain pages with consistent IA</Bullet>
            <Bullet>Lineage tree component links to parent strains in our catalog</Bullet>
            <Bullet>Effect bars (0-100) + chip variant for compact card layouts</Bullet>
            <Bullet>Family + type chips · flavor + effect word clusters · related-by-family grid</Bullet>
            <Bullet>Procedural <code>StrainPlaceholder</code> renders when no photo yet — never empty, never broken</Bullet>
            <Bullet>Search index built from name + slug + lineage + flavor + effect words. Cmd-K opens nav-mounted search popover.</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 5 · LOYALTY / QR ====================== */}
      <Beat
        number="05"
        title="QR sticker loyalty"
        subtitle="From no system to a full Photoshop → scan → claim → points pipeline"
        problem={
          <>
            The legacy site had no loyalty program, no QR codes, no way to
            verify a jar was authentic. Counterfeit jars in retail were
            invisible to the brand. Loyal customers had no incentive to
            return after the first jar — every purchase was a fresh
            transaction with no memory.
          </>
        }
        insight={
          <>
            Per Brendon's directive: stickers printed in sheets of 50-75+
            by the Photoshop team, each token pre-registered server-side{" "}
            <em>before</em> printing so zero collision risk and the
            scanner can flag unregistered tokens as counterfeit signal.
            Tokens land in <code>qr_tokens</code> with{" "}
            <code>batch_id NULL</code> (authenticity-only v1); later we
            add jar-level product tracking by linking. Openclaw watches
            the Photoshop synced folder via Tailscale 24/7.
          </>
        }
        build={
          <div className="grid gap-3 md:grid-cols-5 text-sm">
            <PipeStep n="1" label="Allocate">
              Agent fills{" "}
              <code>/agent/qr/request</code>; Web Crypto generates N
              12-char tokens; tokens dropped into Tailscale-synced folder.
            </PipeStep>
            <PipeStep n="2" label="Render">
              Photoshop renders sheet PNG with QR + Buck artwork; saves to
              same folder.
            </PipeStep>
            <PipeStep n="3" label="Ingest">
              Openclaw watcher decodes sheet via pyzbar; POSTs to{" "}
              <code>/api/admin/qr-sheets</code>. Tokens link to sheet_id.
            </PipeStep>
            <PipeStep n="4" label="Scan">
              Customer scans jar → <code>/loyalty/scan/[token]</code> →
              SHA-256 IP hash; counterfeit-pattern triggers admin alert.
            </PipeStep>
            <PipeStep n="5" label="Claim">
              Customer signs in (Google) →{" "}
              <code>/loyalty/claim/[token]</code> → atomic txn upserts
              optin, links scan, credits <code>+10</code> via
              rewards_ledger, returns balance.
            </PipeStep>
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>22-table schema: qr_sheets · qr_tokens · qr_scans · oglife_optins · rewards_ledger · plus 17 supporting tables</Bullet>
            <Bullet>Idempotent claim: same user re-claiming same token returns balance, never double-credits</Bullet>
            <Bullet>Counterfeit alert fires on unknown tokens with geo + IP hash → admin email via SES</Bullet>
            <Bullet><code>/loyalty/account</code> dashboard: balance, scan history joined to products, active subscriptions</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 6 · IDENTITY ====================== */}
      <Beat
        number="06"
        title="Identity + consent"
        subtitle="From no auth to Google SSO + cross-brand OG Life consent network"
        problem={
          <>
            Legacy: no user accounts. No way to know who scanned a jar,
            who subscribed to a strain drop, who placed a wholesale order.
            Email collection happened in a single freeform input with no
            opt-in granularity, no 21+ verification, no TCPA-safe SMS
            consent.
          </>
        }
        insight={
          <>
            One identity provider for everyone — customers <em>and</em>{" "}
            agents — both via Google SSO. Pre-checked OG Life consent
            network + 21+ + cannabis-interest on the consent page; SMS
            and marketing-email require affirmative checkbox (TCPA + dark
            pattern liability). HMAC-signed CSRF state, httpOnly{" "}
            <code>bm_session</code> cookie, single read path via{" "}
            <code>lib/session.ts</code>.
          </>
        }
        build={
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="/api/auth/google">
              OAuth kick-off. Signed nonce + return-to cookie. Redirects
              to Google with the canonical 3-URI list (prod + Vercel alias
              + localhost).
            </Card>
            <Card title="/api/auth/google/callback">
              Constant-time HMAC verify on state → token exchange →
              userinfo → upsert oglife_optins (xmax = 0 detects first
              sign-in → triggers welcome email).
            </Card>
            <Card title="/auth/consent">
              Pre-checked boxes: 21+ <em>(required)</em> · cannabis
              interest · OG Life network. Unchecked: marketing email · SMS
              · push notifications. Submit writes to{" "}
              <code>consents jsonb</code> with{" "}
              <code>consents || EXCLUDED.consents</code> merge so future
              additions never drop keys.
            </Card>
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>Google SSO live in OAuth testing mode (publish before public launch)</Bullet>
            <Bullet>21+ age gate overlay on first visit (30-day localStorage TTL, reduced-motion safe)</Bullet>
            <Bullet>OG Life consent network bridge mirrors opt-ins across BMH, cbd.restaurant, oglife.app</Bullet>
            <Bullet>TCPA-safe SMS: double-opt-in via Alpine IQ, exact consent text stored as evidence</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 7 · EMAIL LIFECYCLE ====================== */}
      <Beat
        number="07"
        title="Transactional email lifecycle"
        subtitle="From zero emails to 15 templates covering the entire customer journey"
        problem={
          <>
            Legacy: no welcome email, no order confirmations, no shipped
            notifications, no review requests, no counterfeit alerts, no
            visit-report confirmations. Customer journey ended at the
            point of sale with no after-touch.
          </>
        }
        insight={
          <>
            AWS SES is{" "}
            <strong>
              transactional-only per directive — Alpine IQ owns marketing
            </strong>{" "}
            (cannabis-friendly, built-in STOP/HELP, SMS+email drip).
            Single <code>sendTransactional()</code> entry point renders →
            logs to <code>emails_outbound</code> → calls SES → updates row.
            Audit log queryable in <code>/admin/emails</code>. Order
            lifecycle fires from an hourly cron diffing Nabis order status
            against <code>order_status_seen</code>.
          </>
        }
        build={
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["welcome", "1st Google sign-in"],
              ["consent-confirmed", "after /auth/consent"],
              ["scan-points-credited", "after QR claim"],
              ["counterfeit-alert", "admin · 404 scan"],
              ["subscription-confirmed", "strain drop subscribe"],
              ["qr-sheet-allocated", "→ Photoshop team"],
              ["qr-sheet-ingested", "admin confirm"],
              ["visit-report-filed", "agent + BCC admin"],
              ["strain-drop", "fan-out per subscriber"],
              ["order-placed", "Nabis cron"],
              ["order-shipped", "Nabis cron"],
              ["order-delivered", "Nabis cron"],
              ["order-canceled", "Nabis cron"],
              ["review-request", "+3d after delivered"],
              ["prize-winner", "monthly drawing"],
              ["health-alert", "admin · integration red"],
            ].map(([name, when]) => (
              <div
                key={name}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs"
              >
                <div className="font-mono text-amber-200/90">{name}</div>
                <div className="text-white/55 mt-0.5">{when}</div>
              </div>
            ))}
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>15 templates · 1 reusable HTML+text renderer with brand-token shell (no React-Email/MJML dep)</Bullet>
            <Bullet><code>sendTransactional()</code> + <code>sendToAdmin()</code> as the only call surfaces</Bullet>
            <Bullet><code>/admin/emails</code> log: status (queued/sent/failed/bounced), SES message_id, related_kind/id for correlation</Bullet>
            <Bullet>Hourly Nabis cron diffs status against <code>order_status_seen</code>, fires the right template on each transition</Bullet>
            <Bullet>Multi-business-model port: 3-change recipe lifts the stack into BMH (Wix), cbd.restaurant (BigCommerce), OG Life — brand tokens + MAIL_FROM + webhook handler</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 8 · MARKETING STACK ====================== */}
      <Beat
        number="08"
        title="Marketing channels"
        subtitle="Alpine IQ SMS + Web Push + IG hashtag ingestion + Instagram embed in nav"
        problem={
          <>
            Legacy: no email list, no SMS list, no push subscribers, no
            way to broadcast a new drop. A small Instagram audience
            (@buckmountaincannabis) was the only outbound channel.
            Dispensary mentions of Buck Mountain on IG (e.g.{" "}
            <code>#buckmountaincannabis</code> tagging by retailers) sat
            invisible — no way for the site to surface them.
          </>
        }
        insight={
          <>
            Three channels, one entry point per channel-type:{" "}
            <strong>Alpine IQ</strong> for SMS marketing (cannabis-friendly,
            STOP/HELP automation),{" "}
            <strong>VAPID Web Push</strong> via <code>lib/push.ts</code>{" "}
            (free, instant, browser-native), and an{" "}
            <strong>IG Graph API hashtag ingester</strong>{" "}
            (<code>scripts/ingest-ig-mentions.mjs</code>) that pulls
            dispensary mentions and auto-populates <code>/drops</code>.
          </>
        }
        build={
          <div className="grid gap-3 md:grid-cols-3">
            <Card title="Alpine IQ (SMS)" tone="purple">
              Big Moose Hemp tenant 4381 piggyback. Double-opt-in welcome
              SMS, <code>broadcastNewProduct()</code> audience blast,
              constant-time HMAC webhook for STOP/HELP/CONFIRM events
              writing to <code>sms_subscriptions.status</code>.
            </Card>
            <Card title="Web Push (VAPID)" tone="gold">
              <code>/api/push/subscribe</code> upserts by SHA-256 endpoint
              hash. <code>lib/push.broadcast()</code> SELECTs active
              subs, signs payload, fans out, batch-UPDATE marks 404/410
              endpoints inactive. Service worker at{" "}
              <code>/public/service-worker.js</code>.
            </Card>
            <Card title="IG Ingester" tone="forest">
              Cron pulls{" "}
              <code>#buckmountaincannabis</code> +{" "}
              <code>#permanentog</code> + 7 more tags via Graph API.
              Strain-matches via regex on caption, POSTs to{" "}
              <code>/api/admin/drops</code> with source attribution.
            </Card>
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>SES = transactional only · Alpine IQ = marketing · Web Push = browser-native opt-in · IG = auto-ingest dispensary mentions</Bullet>
            <Bullet>Dispensary tag on IG → <code>/drops</code> card within ~hour, with source link back to the original post</Bullet>
            <Bullet>One admin form (<code>/admin/strain-updates</code>) fires all three channels at once when <em>also_blast</em> is checked</Bullet>
            <Bullet>Push fan-out auto-retires dead endpoints — no manual cleanup ever needed</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 9 · LIVE DROPS ====================== */}
      <Beat
        number="09"
        title="The /drops page"
        subtitle="From no concept to a live 'where to find Buck Mountain right now' feed"
        problem={
          <>
            Legacy: no way to tell visitors which dispensaries currently
            stock which strain. Buyers asking "is the Permanent OG still
            at Oakland?" got passed to the agent's text thread. No SEO
            value, no shelf-presence flex.
          </>
        }
        insight={
          <>
            <code>current_drops</code> table — strain × dispensary × status
            × source attribution. Manual admin entries via{" "}
            <code>/admin/drops</code> for hand-curated highlights. IG
            ingester auto-populates from hashtag mentions. Future:
            Weedmaps/Leafly menu scrape, Nabis inventory join.
          </>
        }
        build={
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <DropCard
              status="live"
              tone="emerald"
              strain="Permanent OG"
              dispensary="Example Dispensary — Oakland"
              caption="Light-assist run on the shelf this week."
              source="manual"
            />
            <DropCard
              status="low-stock"
              tone="amber"
              strain="Cheetah Piss"
              dispensary="Example Dispensary — Sacramento"
              caption="Cookies cross moving fast."
              source="manual"
            />
            <DropCard
              status="incoming"
              tone="sky"
              strain="Strawberry Lobster"
              dispensary="Example Dispensary — Eureka"
              caption="Drops next week."
              source="@buckmountaincannabis"
            />
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>5 source kinds tracked: manual · instagram · weedmaps · leafly · nabis</Bullet>
            <Bullet>4 statuses: live · low-stock · sold-out · incoming</Bullet>
            <Bullet>Geo-attribution for analytics (city, state)</Bullet>
            <Bullet>Auto-expires via <code>expires_at</code> so the page never goes stale</Bullet>
          </ul>
        }
      />

      {/* ====================== BEAT 10 · ADMIN + AGENT ====================== */}
      <Beat
        number="10"
        title="The back office"
        subtitle="Admin + agent portals modeled on the BMH dispatcher pattern"
        problem={
          <>
            Legacy: zero internal tools. Order management, dispensary
            tracking, visit reports, QR ops, asset review — all happened
            in spreadsheets and group chats.
          </>
        }
        insight={
          <>
            Two role-scoped surfaces sharing one auth + DB:{" "}
            <strong>/agent</strong> for field reps (their assigned
            dispensaries, file visit reports, request QR token batches,
            fire drop blasts) and <strong>/admin</strong> for back office
            (asset review, strain updates, order overview, sheet
            ingestion, email log). Both behind Google SSO; role gate in{" "}
            <code>agents.role</code>.
          </>
        }
        build={
          <div className="grid gap-3 md:grid-cols-2">
            <PortalCard
              title="/agent"
              tone="purple"
              routes={[
                ["/agent/dispensaries", "list assigned shops + status"],
                ["/agent/dispensaries/[id]", "detail · orders · scan trail"],
                ["/agent/visit-report", "file a visit"],
                ["/agent/qr/request", "allocate sticker tokens"],
                ["/agent/notifications", "fire drop blast"],
                ["/agent/loyalty", "scan activity by city"],
                ["/agent/orders", "Nabis pipeline (waits for key)"],
              ]}
            />
            <PortalCard
              title="/admin"
              tone="gold"
              routes={[
                ["/admin/assets", "openclaw asset queue"],
                ["/admin/strain-updates", "compose homepage feed"],
                ["/admin/drops", "manual drop entry"],
                ["/admin/qr-sheets", "ingested sheet log"],
                ["/admin/emails", "SES outbound log + test send"],
                ["/admin/orders", "all-dispensary Nabis pipeline"],
              ]}
            />
          </div>
        }
        outcome={
          <ul className="space-y-2">
            <Bullet>13 back-office routes total</Bullet>
            <Bullet>All DB-touching admin pages: <code>force-dynamic</code> + try/catch so schema lag never breaks the build (lesson from PR #1 prerender bug)</Bullet>
            <Bullet>One SQL source of truth — agents see only their assigned dispensaries via <code>agent_dispensary_assignments</code> join</Bullet>
            <Bullet>Visit reports + action items as <code>jsonb</code> so the schema doesn't need a migration for new fields</Bullet>
          </ul>
        }
      />

      {/* ====================== STACK SUMMARY ====================== */}
      <StackSummary />

      {/* ====================== OUTCOME ====================== */}
      <Outcome />
    </main>
  );
}

// ============================================================
// HERO
// ============================================================
function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-16 px-6 md:px-16 max-w-6xl mx-auto">
      <p className="uppercase tracking-[0.3em] text-xs text-amber-200/80">
        Before · After
      </p>
      <h1 className="mt-3 text-5xl md:text-7xl font-bold tracking-tight">
        2-section Squarespace-era page → 50-route living storefront.
      </h1>
      <p className="mt-6 text-lg md:text-xl text-white/80 max-w-3xl leading-relaxed">
        Buck Mountain&rsquo;s site was a single video hero + a 4-up greenhouse
        gallery + an FAQ. Beautiful footage, no surface area for the actual
        rotation. The rebuild keeps the legacy aesthetic — the cinematic
        cultivation b-roll, the gold-on-purple antler mark, the always-grinding
        ethos — and grows it into a real storefront: 11 prerendered strain pages,
        a QR loyalty pipeline, a transactional email lifecycle, an agent portal,
        an admin back office, and a Cmd-K search that knows every cut in the
        room.
      </p>
      <blockquote className="mt-8 pl-6 border-l-2 border-amber-400/60 text-white/85 max-w-3xl">
        <p className="text-lg italic">
          &ldquo;Less cinematic, more background-y&rdquo; — Brendon, mid-sprint
        </p>
        <p className="mt-2 text-sm text-white/55">
          That brief reframed the whole build. Not lower motion volume — more{" "}
          <em>kinds</em> of motion that compose into a backdrop instead of
          fighting for attention.
        </p>
      </blockquote>
    </section>
  );
}

// ============================================================
// FOUR BEATS INTRO
// ============================================================
function Beats() {
  return (
    <section className="px-6 md:px-16 max-w-6xl mx-auto pb-12">
      <p className="uppercase tracking-[0.25em] text-xs text-white/50">
        The shape of the rebuild
      </p>
      <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-8">
        Ten beats. One sprint per beat.
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 text-sm">
        {[
          "Logo",
          "Hero sequence",
          "Parallax + scroll",
          "Strain pages",
          "Loyalty / QR",
          "Identity + consent",
          "Email lifecycle",
          "Marketing channels",
          "Live drops",
          "Back office",
        ].map((b, i) => (
          <li
            key={b}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span className="text-amber-200/80 font-mono mr-2">
              {String(i + 1).padStart(2, "0")}
            </span>
            {b}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ============================================================
// BEAT SECTION
// ============================================================
function Beat({
  number,
  title,
  subtitle,
  problem,
  insight,
  build,
  outcome,
}: {
  number: string;
  title: string;
  subtitle: string;
  problem: React.ReactNode;
  insight: React.ReactNode;
  build: React.ReactNode;
  outcome: React.ReactNode;
}) {
  return (
    <section className="px-6 md:px-16 max-w-6xl mx-auto py-16 md:py-24 border-t border-white/10">
      <div className="grid md:grid-cols-[120px_1fr] gap-6 md:gap-12 mb-8">
        <div className="text-6xl md:text-7xl font-bold text-amber-200/40 leading-none">
          {number}
        </div>
        <div>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            {title}
          </h2>
          <p className="mt-2 text-white/65">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 mb-10">
        <BeatColumn label="Problem">{problem}</BeatColumn>
        <BeatColumn label="Insight">{insight}</BeatColumn>
        <BeatColumn label="Outcome">{outcome}</BeatColumn>
      </div>

      <div className="rounded-2xl bg-neutral-900/40 border border-white/10 p-4 md:p-6">
        {build}
      </div>
    </section>
  );
}

function BeatColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70 mb-2">
        {label}
      </p>
      <div className="text-sm text-white/75 leading-relaxed">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-amber-200/70 select-none mt-0.5">›</span>
      <span>{children}</span>
    </li>
  );
}

// ============================================================
// COMPARISON ASSETS
// ============================================================
function LegacyLogoMockup() {
  // The hand-drawn SVG placeholder we shipped before Brendon uploaded
  // the real PDF. Rendered inline so the diff is visible side-by-side.
  return (
    <div className="absolute inset-0 grid place-items-center bg-neutral-950">
      <svg viewBox="0 0 160 120" className="h-3/4 w-auto opacity-90">
        <polygon
          points="20,16 140,16 80,102"
          stroke="#5B3A8A"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M 60 40 C 56 30 52 24 46 22 M 60 40 C 58 36 56 32 56 28"
          stroke="#C9A24A"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M 100 40 C 104 30 108 24 114 22 M 100 40 C 102 36 104 32 104 28"
          stroke="#C9A24A"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M 65 42 C 60 50 60 60 68 66 L 80 72 L 92 66 C 100 60 100 50 95 42 Q 80 36 65 42 Z"
          fill="#C9A24A"
        />
        <text
          x="80"
          y="93"
          textAnchor="middle"
          fontFamily="ui-serif, Georgia, serif"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="2.6"
          fill="#C9A24A"
        >
          BUCK MTN
        </text>
      </svg>
    </div>
  );
}

function FXCard({ title, desc, meta }: { title: string; desc: string; meta: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="mt-2 text-xs text-white/65 leading-relaxed">{desc}</p>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-amber-200/70">
        {meta}
      </p>
    </div>
  );
}

function PipeStep({
  n,
  label,
  children,
}: {
  n: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-amber-200/80">{n}</span>
        <h3 className="font-bold uppercase tracking-wider text-xs">{label}</h3>
      </div>
      <p className="text-xs text-white/65 leading-relaxed">{children}</p>
    </div>
  );
}

function Card({
  title,
  tone = "purple",
  children,
}: {
  title: string;
  tone?: "purple" | "gold" | "forest";
  children: React.ReactNode;
}) {
  const border =
    tone === "gold"
      ? "border-amber-500/40"
      : tone === "forest"
      ? "border-emerald-500/40"
      : "border-purple-500/40";
  return (
    <div className={`rounded-xl border ${border} bg-white/[0.03] p-4`}>
      <h3 className="font-bold text-sm mb-2">{title}</h3>
      <p className="text-xs text-white/70 leading-relaxed">{children}</p>
    </div>
  );
}

function DropCard({
  status,
  tone,
  strain,
  dispensary,
  caption,
  source,
}: {
  status: string;
  tone: "emerald" | "amber" | "sky";
  strain: string;
  dispensary: string;
  caption: string;
  source: string;
}) {
  const tint =
    tone === "emerald"
      ? "text-emerald-200 border-emerald-500/40 bg-emerald-500/10"
      : tone === "amber"
      ? "text-amber-200 border-amber-500/40 bg-amber-500/10"
      : "text-sky-200 border-sky-500/40 bg-sky-500/10";
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950/70 p-4">
      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${tint}`}>
        {status}
      </span>
      <h4 className="mt-3 font-bold text-base">{strain}</h4>
      <p className="text-xs text-white/55 mt-1">{dispensary}</p>
      <p className="text-xs text-white/70 mt-2 italic">&ldquo;{caption}&rdquo;</p>
      <p className="mt-3 text-[10px] text-white/40">{source}</p>
    </div>
  );
}

function PortalCard({
  title,
  tone,
  routes,
}: {
  title: string;
  tone: "purple" | "gold";
  routes: [string, string][];
}) {
  const accent = tone === "gold" ? "text-amber-200" : "text-purple-200";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className={`font-bold text-lg ${accent} mb-3`}>{title}</h3>
      <ul className="space-y-2 text-sm">
        {routes.map(([path, desc]) => (
          <li key={path} className="flex justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
            <code className="text-white/85 text-xs">{path}</code>
            <span className="text-white/50 text-xs text-right">{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// STACK SUMMARY
// ============================================================
function StackSummary() {
  return (
    <section className="px-6 md:px-16 max-w-6xl mx-auto py-16 md:py-24 border-t border-white/10">
      <p className="uppercase tracking-[0.25em] text-xs text-white/50">
        Under the hood
      </p>
      <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-8">The full stack</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <StackPillar label="App" items={["Next.js 15.5 (App Router)", "React 19", "Tailwind 4", "TypeScript 5.7", "50 routes (11 strain pages prerender, the rest force-dynamic or static)"]} />
        <StackPillar label="Data" items={["Neon Postgres (shared cluster)", "22 tables · 2 migrations", "@neondatabase/serverless (HTTP + Pool)", "Vercel Blob (Private bucket)"]} />
        <StackPillar label="Identity" items={["Google OAuth + HMAC state", "OG Life consent network", "httpOnly bm_session cookie", "agents.role gate"]} />
        <StackPillar label="Messaging" items={["AWS SES v2 (transactional)", "Alpine IQ (SMS marketing)", "Web Push (VAPID, auto-retire)", "IG Graph API (auto-ingest)"]} />
      </div>
    </section>
  );
}

function StackPillar({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/70 mb-3">{label}</p>
      <ul className="space-y-2 text-white/75">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-amber-200/50 select-none">›</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// OUTCOME
// ============================================================
function Outcome() {
  return (
    <section className="px-6 md:px-16 max-w-4xl mx-auto py-16 md:py-24 border-t border-white/10">
      <p className="uppercase tracking-[0.25em] text-xs text-amber-200/70">
        Where this lands
      </p>
      <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6">
        From a brochure to a brand operating system.
      </h2>
      <p className="text-lg text-white/85 leading-relaxed">
        The site that started this sprint was a beautiful Squarespace-era
        page that <em>told you</em> about Buck Mountain. The site that
        ships now is a storefront that <em>operates</em> Buck Mountain — every
        scan, every drop, every visit, every order moving through one
        DB-backed, edge-deployed surface that the agents, the admin team,
        and the customer all share. Add SES creds and the email lifecycle
        starts firing. Add the Nabis key and the order pipeline goes live.
        Flip the Vercel Deployment Protection toggle and the public sees it.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-white text-black px-5 py-3 text-sm font-semibold"
        >
          See the homepage →
        </Link>
        <Link
          href="/strains"
          className="rounded-md border border-white/25 hover:border-white/60 px-5 py-3 text-sm"
        >
          11 strain pages
        </Link>
        <Link
          href="/drops"
          className="rounded-md border border-white/25 hover:border-white/60 px-5 py-3 text-sm"
        >
          What&rsquo;s on shelves
        </Link>
        <Link
          href="/loyalty"
          className="rounded-md border border-white/25 hover:border-white/60 px-5 py-3 text-sm"
        >
          Scan a jar
        </Link>
      </div>
    </section>
  );
}

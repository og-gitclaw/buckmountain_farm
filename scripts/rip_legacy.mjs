#!/usr/bin/env node
/**
 * scripts/rip_legacy.mjs
 *
 * Headless Chromium rip of the legacy buckmountaincannabis.com site.
 * Run from the home machine (openclaw or any dev box with Node 18+):
 *
 *   node scripts/rip_legacy.mjs
 *
 * First run will prompt to install Playwright Chromium (~150MB). Subsequent
 * runs reuse the cached browser. The script:
 *
 *   1. Visits https://buckmountaincannabis.com/, waits for network idle so
 *      the Squarespace SPA fully hydrates.
 *   2. Sweeps the DOM for hero videos, large backdrop images, and CSS rules
 *      matching the parallax/scroll keywords.
 *   3. Pulls /robots.txt and /sitemap.xml.
 *   4. Visits every URL in the sitemap (capped), captures title + meta +
 *      first 1500 chars of text for SEO continuity.
 *   5. Screenshots mobile (390x844) + desktop (1440x900) viewports at 5
 *      scroll positions each.
 *   6. Downloads every detected video + backdrop into public/assets/ripped/raw/.
 *   7. Writes a JSON manifest at public/assets/ripped/manifest.json.
 *
 * Everything lands in public/assets/ripped/ which is gitignored — review,
 * then move the keepers into public/assets/video/ + public/assets/backdrops/.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(__dirname);
const OUT = join(REPO, "public", "assets", "ripped");
const RAW = join(OUT, "raw");
const SHOTS = join(OUT, "screenshots");
const PAGES = join(OUT, "pages");

const LEGACY = "https://buckmountaincannabis.com";
const MAX_PAGES = 30;          // Cap on per-page deep-scrape (sitemap walk).
const SCROLL_STOPS = 5;

// --- Playwright lazy install -------------------------------------------------

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.log("[rip] installing playwright (one-time, ~150MB) …");
    const res = spawnSync(
      "npm",
      ["install", "--no-save", "--silent", "playwright@1.49.0"],
      { cwd: REPO, stdio: "inherit" },
    );
    if (res.status !== 0) throw new Error("playwright install failed");
    spawnSync("npx", ["--yes", "playwright", "install", "chromium"], {
      cwd: REPO,
      stdio: "inherit",
    });
    return await import("playwright");
  }
}

// --- Helpers -----------------------------------------------------------------

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function downloadBinary(url, dest) {
  if (existsSync(dest)) return { skipped: true, dest };
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    return { ok: false, status: res.status };
  }
  await ensureDir(dirname(dest));
  await pipeline(res.body, createWriteStream(dest));
  return { ok: true, dest };
}

function sanitize(s, max = 80) {
  return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, max);
}

function basenameFromUrl(u) {
  try {
    const { pathname } = new URL(u);
    return sanitize(pathname.split("/").pop() || "asset");
  } catch {
    return sanitize(u);
  }
}

// --- Per-page extraction -----------------------------------------------------

const PAGE_SCRAPE = `() => {
  const videos = Array.from(document.querySelectorAll('video, video source'))
    .map(v => v.currentSrc || v.src || v.getAttribute('src'))
    .filter(Boolean);
  const bgVideos = [];
  for (const el of document.querySelectorAll('[data-video-url],[data-background-video]')) {
    const v = el.getAttribute('data-video-url') || el.getAttribute('data-background-video');
    if (v) bgVideos.push(v);
  }
  const images = Array.from(document.images)
    .filter(i => (i.naturalWidth || i.width) >= 800)
    .map(i => ({
      src: i.currentSrc || i.src,
      alt: i.alt || null,
      w: i.naturalWidth,
      h: i.naturalHeight,
      parent: (i.closest('section,[class*="section"]') || {}).id || null,
    }));
  const links = Array.from(document.links).map(a => ({ href: a.href, text: (a.textContent || '').trim().slice(0, 80) }));
  const cssRules = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules || [];
      for (const r of Array.from(rules)) {
        const t = r.cssText || '';
        if (/parallax|scroll-timeline|animation-timeline|background-attachment|will-change|transform:\\s*translate/i.test(t)) {
          cssRules.push(t);
        }
      }
    } catch {}
  }
  const meta = {};
  for (const m of document.querySelectorAll('meta')) {
    const k = m.getAttribute('property') || m.getAttribute('name');
    const v = m.getAttribute('content');
    if (k && v) meta[k] = v;
  }
  const text = (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 1500);
  return {
    title: document.title,
    meta,
    videos,
    bgVideos,
    images,
    links,
    cssRules,
    text,
  };
}`;

// --- Main --------------------------------------------------------------------

async function main() {
  const playwright = await ensurePlaywright();
  const { chromium, devices } = playwright;

  await Promise.all([ensureDir(RAW), ensureDir(SHOTS), ensureDir(PAGES)]);

  const browser = await chromium.launch({ headless: true });
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const ctxMobile = await browser.newContext({ ...devices["iPhone 14 Pro"] });

  const manifest = {
    started_at: new Date().toISOString(),
    legacy_host: LEGACY,
    pages: [],
    videos: new Set(),
    backdrops: new Set(),
    css_rules: new Set(),
    sitemap_urls: [],
  };

  console.log("[rip] step 1 — robots.txt + sitemap.xml");
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    try {
      const r = await fetch(LEGACY + path);
      const body = await r.text();
      await writeFile(join(OUT, path.replace(/^\//, "").replace("/", "_")), body);
      if (path === "/sitemap.xml") {
        const urls = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
        manifest.sitemap_urls = urls;
      }
    } catch (e) {
      console.log(`[rip] warn fetching ${path}: ${e.message}`);
    }
  }

  // Always include the homepage even if no sitemap.
  const toVisit = [LEGACY + "/"];
  for (const u of manifest.sitemap_urls) {
    if (!toVisit.includes(u)) toVisit.push(u);
    if (toVisit.length >= MAX_PAGES) break;
  }

  console.log(`[rip] step 2 — scraping ${toVisit.length} pages`);
  for (const [i, url] of toVisit.entries()) {
    console.log(`  [${i + 1}/${toVisit.length}] ${url}`);
    let page;
    try {
      page = await ctxDesktop.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Let Squarespace SPA settle a beat past networkidle.
      await page.waitForTimeout(1500);
      const data = await page.evaluate(PAGE_SCRAPE);
      for (const v of data.videos) manifest.videos.add(v);
      for (const v of data.bgVideos) manifest.videos.add(v);
      for (const img of data.images) manifest.backdrops.add(img.src);
      for (const r of data.cssRules) manifest.css_rules.add(r);

      const pathSlug = sanitize(new URL(url).pathname || "_root", 60);
      await writeFile(
        join(PAGES, `${pathSlug || "_root"}.json`),
        JSON.stringify({ url, ...data }, null, 2),
      );
      manifest.pages.push({
        url,
        title: data.title,
        meta_description: data.meta.description,
        og_image: data.meta["og:image"],
        link_count: data.links.length,
        video_count: data.videos.length,
        image_count: data.images.length,
      });

      // Homepage gets the full screenshot set + mobile pass.
      if (i === 0) {
        for (let s = 0; s < SCROLL_STOPS; s++) {
          await page.evaluate(
            (stop) => window.scrollTo(0, (document.body.scrollHeight * stop) / 5),
            s,
          );
          await page.waitForTimeout(600);
          await page.screenshot({
            path: join(SHOTS, `desktop_scroll_${s}.png`),
            fullPage: false,
          });
        }

        const mPage = await ctxMobile.newPage();
        await mPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        await mPage.waitForTimeout(1500);
        for (let s = 0; s < SCROLL_STOPS; s++) {
          await mPage.evaluate(
            (stop) => window.scrollTo(0, (document.body.scrollHeight * stop) / 5),
            s,
          );
          await mPage.waitForTimeout(600);
          await mPage.screenshot({
            path: join(SHOTS, `mobile_scroll_${s}.png`),
            fullPage: false,
          });
        }
        await mPage.close();
      }
    } catch (e) {
      console.log(`    err: ${e.message}`);
      manifest.pages.push({ url, error: e.message });
    } finally {
      if (page) await page.close();
    }
  }

  console.log(`[rip] step 3 — downloading ${manifest.videos.size} videos + ${manifest.backdrops.size} backdrops`);
  for (const v of manifest.videos) {
    const dest = join(RAW, "video_" + basenameFromUrl(v));
    try {
      const r = await downloadBinary(v, dest);
      console.log(`  video ${v} → ${r.skipped ? "exists" : r.ok ? "ok" : "fail " + r.status}`);
    } catch (e) {
      console.log(`  video ${v} err: ${e.message}`);
    }
  }
  for (const b of manifest.backdrops) {
    const dest = join(RAW, "img_" + basenameFromUrl(b));
    try {
      const r = await downloadBinary(b, dest);
      console.log(`  img ${b.slice(0, 80)} → ${r.skipped ? "exists" : r.ok ? "ok" : "fail " + r.status}`);
    } catch (e) {
      console.log(`  img ${b.slice(0, 80)} err: ${e.message}`);
    }
  }

  manifest.videos = Array.from(manifest.videos);
  manifest.backdrops = Array.from(manifest.backdrops);
  manifest.css_rules = Array.from(manifest.css_rules);
  manifest.finished_at = new Date().toISOString();

  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  await browser.close();

  console.log("\n[rip] done.");
  console.log(`  manifest:  public/assets/ripped/manifest.json`);
  console.log(`  pages:     public/assets/ripped/pages/`);
  console.log(`  raw media: public/assets/ripped/raw/`);
  console.log(`  shots:     public/assets/ripped/screenshots/`);
  console.log("\nNext: review raw/ — move keepers into public/assets/video/ + public/assets/backdrops/.");
}

main().catch((e) => {
  console.error("[rip] fatal:", e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * scripts/audit-menu-placement.mjs
 *
 * Menu-placement audit: for each active/lapsed dispensary, open its
 * Weedmaps / Leafly / house menu in headless Chromium and check whether
 * Buck Mountain SKUs are listed. POSTs results to
 * /api/agent/menu-placement, which upserts menu_listings rows that
 * /agent/menu-placement renders as verified listed/not-listed state.
 *
 * RUNS ON OPENCLAW (or any box with Node 18+ and network), NOT on Vercel:
 * headless Chromium can't run in the serverless runtime. Playwright is
 * lazy-installed on first run (same pattern as scripts/rip_legacy.mjs).
 *
 *   ADMIN_API_TOKEN=...            # to read the dispensary list
 *   ADMIN_ASSET_INGEST_TOKEN=...   # to POST results (same token the
 *                                  #   QR-sheet + this watcher use)
 *   BUCKMOUNTAIN_BASE=https://buckmountain.farm \
 *   node scripts/audit-menu-placement.mjs
 *
 * Politeness / ToS note:
 *   Weedmaps + Leafly discourage scraping. This script is deliberately
 *   gentle: one page at a time, a real desktop UA, a randomized delay
 *   between stores, and it honors a MAX_STORES cap. It reads only the
 *   public menu HTML — no login, no API circumvention. Treat the output
 *   as a best-effort signal for a rep to verify by hand, not ground
 *   truth, and disable it if either platform asks. Prefer an official
 *   data feed (Weedmaps for Business API) if/when available.
 */

import { spawnSync } from "node:child_process";

const BASE = process.env.BUCKMOUNTAIN_BASE ?? "https://buckmountain.farm";
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;
const INGEST_TOKEN = process.env.ADMIN_ASSET_INGEST_TOKEN;

const MAX_STORES = Number(process.env.MAX_STORES ?? 100);
const NAV_TIMEOUT_MS = 30_000;
const MIN_DELAY_MS = 3_000;
const MAX_DELAY_MS = 8_000;

// Brand + strain terms we treat as a "Buck Mountain is listed" hit. Keep
// lowercase; matching is case-insensitive substring on the menu text.
const BRAND_TERMS = ["buck mountain", "buckmountain", "buck mtn"];
const STRAIN_TERMS = [
  "permanent og",
  "gelato 41",
  "cheetah piss",
  "grape lobster",
  "strawberry lobster",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () =>
  MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.log("[audit] installing playwright (one-time, ~150MB) …");
    const a = spawnSync("npm", ["install", "--no-save", "--silent", "playwright@1.49.0"], {
      stdio: "inherit",
    });
    if (a.status !== 0) throw new Error("playwright install failed");
    spawnSync("npx", ["--yes", "playwright", "install", "chromium"], { stdio: "inherit" });
    return import("playwright");
  }
}

async function loadDispensaries() {
  if (!ADMIN_API_TOKEN) throw new Error("ADMIN_API_TOKEN is required to read the dispensary list");
  const res = await fetch(`${BASE}/api/admin/dispensaries?status=active,lapsed`, {
    headers: { authorization: `Bearer ${ADMIN_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`dispensary list fetch failed: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.dispensaries) ? json.dispensaries : [];
}

function detectMatches(text) {
  const hay = text.toLowerCase();
  const brandHit = BRAND_TERMS.some((t) => hay.includes(t));
  const matched = STRAIN_TERMS.filter((t) => hay.includes(t));
  // A store "lists Buck" if the brand name appears, or if specific Buck
  // strains do. Strain-only matches are weaker (other brands run the same
  // genetics) so we keep the names for the rep to eyeball.
  return { listed: brandHit || matched.length > 0, matched_names: matched };
}

async function checkOne(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500); // let lazy menu items hydrate
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    const { listed, matched_names } = detectMatches(text);
    return { listed, match_count: matched_names.length, matched_names, error: null };
  } catch (err) {
    return {
      listed: false,
      match_count: 0,
      matched_names: [],
      error: err instanceof Error ? err.message : "nav-failed",
    };
  }
}

async function postResults(results) {
  if (!INGEST_TOKEN) throw new Error("ADMIN_ASSET_INGEST_TOKEN is required to post results");
  const res = await fetch(`${BASE}/api/agent/menu-placement`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${INGEST_TOKEN}`,
    },
    body: JSON.stringify({ schema: "buckmountain-farm/menu-placement/v1", results }),
  });
  const json = await res.json().catch(() => ({}));
  console.log(`[audit] ingest → ${res.status}`, json);
}

async function main() {
  const stores = (await loadDispensaries()).slice(0, MAX_STORES);
  console.log(`[audit] auditing ${stores.length} stores`);
  const { chromium } = await ensurePlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  const results = [];
  for (const s of stores) {
    const platforms = [
      ["weedmaps", s.weedmaps_url],
      ["leafly", s.leafly_url],
      ["house", s.menu_url],
    ];
    for (const [platform, url] of platforms) {
      if (!url) continue;
      console.log(`[audit] ${s.id} · ${platform} · ${url}`);
      const r = await checkOne(page, url);
      results.push({ dispensary_id: s.id, platform, menu_url: url, ...r });
      await sleep(jitter());
    }
  }

  await browser.close();
  if (results.length === 0) {
    console.log("[audit] no menu URLs to check — nothing to post");
    return;
  }
  await postResults(results);
}

main().catch((err) => {
  console.error("[audit] fatal:", err);
  process.exit(1);
});

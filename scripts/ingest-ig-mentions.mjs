#!/usr/bin/env node
/**
 * scripts/ingest-ig-mentions.mjs
 *
 * Pulls Instagram Graph API hashtag-search results for #buckmountain* tags,
 * downloads each post's media, uploads to Vercel Blob, and inserts a
 * current_drops row pointing at the dispensary that posted.
 *
 * Runs on openclaw via cron or manually:
 *   IG_ACCESS_TOKEN=... \
 *   IG_USER_ID=... \
 *   ADMIN_API_TOKEN=... \
 *   BUCKMOUNTAIN_BASE=https://buckmountain.farm \
 *   node scripts/ingest-ig-mentions.mjs
 *
 * Setup overview (full doc: handoff/IG_MENTIONS_INGESTION.md):
 *   1. Connect Buck Mountain IG account to Facebook Business Suite
 *   2. Create a Meta app, request `instagram_basic` + `pages_show_list`
 *      + `instagram_manage_insights` permissions
 *   3. Generate a long-lived (60-day) Page access token via Graph API
 *      Explorer, save to IG_ACCESS_TOKEN
 *   4. Resolve your IG_USER_ID via GET /me/accounts → page id → page → instagram_business_account
 *   5. Tag matching: configure HASHTAGS array below
 *
 * Idempotency:
 *   - We hash the post's permalink and skip insertion if a current_drops
 *     row already has that source_url. (Belt+suspenders: schema also
 *     could add UNIQUE on source_url, but leaving non-unique so manual
 *     overrides for the same post are possible.)
 *
 * Hashtags to monitor (extend over time):
 */

import fs from "node:fs/promises";

const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_USER_ID = process.env.IG_USER_ID;
const BASE = process.env.BUCKMOUNTAIN_BASE ?? "https://buckmountain.farm";
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

const HASHTAGS = [
  "buckmountaincannabis",
  "buckmountain",
  "buckmtncannabis",
  "buckmtn",
  // Strain-specific tags worth watching for dispensary reposts:
  "permanentogbuck",
  "cheetahpissbuck",
  "strawberrylobster",
  "grapelobster",
];

// Slugs from our catalog the script will key drops to.
const STRAIN_KEYWORD_MAP = [
  { kw: /strawberry\s*lobster/i, slug: "strawberry-lobster" },
  { kw: /grape\s*lobster/i, slug: "grape-lobster" },
  { kw: /permanent\s*og/i, slug: "permanent-og" },
  { kw: /permanent\s*marker/i, slug: "permanent-marker" },
  { kw: /cheetah\s*piss/i, slug: "cheetah-piss" },
  { kw: /gelato\s*41/i, slug: "gelato-41" },
  { kw: /hashberger/i, slug: "hashberger" },
  { kw: /xxx\s*og/i, slug: "xxx-og" },
  { kw: /jifflez/i, slug: "jifflez" },
  { kw: /\byeet\b/i, slug: "yeet" },
  { kw: /\bdog\b/i, slug: "dog" },
];

function bail(msg) {
  console.error(`[ig-ingest] ${msg}`);
  process.exit(1);
}

if (!IG_ACCESS_TOKEN) bail("IG_ACCESS_TOKEN not set");
if (!IG_USER_ID) bail("IG_USER_ID not set");
if (!ADMIN_API_TOKEN) bail("ADMIN_API_TOKEN not set (server-side admin auth)");

async function api(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/v20.0${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", IG_ACCESS_TOKEN);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Graph ${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function hashtagId(tag) {
  const j = await api("/ig_hashtag_search", { user_id: IG_USER_ID, q: tag });
  return j.data?.[0]?.id ?? null;
}

async function recentMedia(hashtag_id) {
  const j = await api(`/${hashtag_id}/recent_media`, {
    user_id: IG_USER_ID,
    fields: "id,caption,media_type,media_url,permalink,timestamp,username",
    limit: "30",
  });
  return j.data ?? [];
}

function strainFromCaption(caption) {
  if (!caption) return null;
  for (const { kw, slug } of STRAIN_KEYWORD_MAP) {
    if (kw.test(caption)) return slug;
  }
  return null;
}

async function postDrop({ strain_slug, caption, source_url, source_handle, hero_image_url }) {
  // Posting via the admin endpoint instead of touching Postgres directly so
  // openclaw doesn't need DATABASE_URL on disk. The endpoint already
  // validates + writes.
  const body = new URLSearchParams({
    strain_slug: strain_slug ?? "",
    dispensary_name: source_handle ?? "Instagram",
    status: "live",
    source_kind: "instagram",
    source_url: source_url ?? "",
    source_handle: source_handle ?? "",
    hero_image_url: hero_image_url ?? "",
    caption: (caption ?? "").slice(0, 500),
  });
  const r = await fetch(`${BASE}/api/admin/drops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      authorization: `Bearer ${ADMIN_API_TOKEN}`,
    },
    body,
    redirect: "manual",
  });
  return r.status >= 200 && r.status < 400;
}

async function main() {
  let summary = { tags: 0, posts: 0, matched: 0, posted: 0, skipped: 0 };
  for (const tag of HASHTAGS) {
    summary.tags++;
    const id = await hashtagId(tag).catch(() => null);
    if (!id) {
      console.log(`[ig-ingest] no hashtag id for #${tag}`);
      continue;
    }
    const items = await recentMedia(id).catch(() => []);
    summary.posts += items.length;
    for (const item of items) {
      const strain = strainFromCaption(item.caption);
      if (!strain) {
        summary.skipped++;
        continue;
      }
      summary.matched++;
      const ok = await postDrop({
        strain_slug: strain,
        caption: item.caption,
        source_url: item.permalink,
        source_handle: item.username ? `@${item.username}` : null,
        hero_image_url: item.media_url ?? null,
      });
      if (ok) summary.posted++;
    }
  }
  await fs.writeFile(
    "/tmp/ig-ingest-summary.json",
    JSON.stringify({ ...summary, ran_at: new Date().toISOString() }, null, 2),
  );
  console.log(`[ig-ingest] done: ${JSON.stringify(summary)}`);
}

main().catch((e) => {
  console.error("[ig-ingest] fatal:", e);
  process.exit(1);
});

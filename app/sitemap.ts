/**
 * /sitemap.xml — public-safe URL inventory.
 *
 * Currently NOT linked from anywhere (robots.ts blocks all crawlers
 * until launch). Sits here ready for the flip — when Brendon turns off
 * Deployment Protection and switches robots.ts to allow public crawling,
 * this sitemap is already populated.
 *
 * Includes /, /strains, /strains/<each strain>, /blog, /store, /loyalty,
 * /strains/updates. EXCLUDES /admin/*, /agent/*, /api/*, /auth/consent,
 * /loyalty/scan/[token], /loyalty/claim/[token] — admin + identity + per-user.
 */

import type { MetadataRoute } from "next";
import { STRAINS } from "@/data/strains";

const BASE = "https://buckmountain.farm";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const strain_urls = STRAINS.map((s) => ({
    url: `${BASE}/strains/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  return [
    { url: `${BASE}/`,                 lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/strains`,          lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/strains/updates`,  lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE}/store`,            lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/blog`,             lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/loyalty`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/about`,            lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/contact`,          lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE}/wholesale`,        lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/coa`,              lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`,          lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    ...strain_urls,
  ];
}

import type { NextConfig } from "next";

const config: NextConfig = {
  // Preview-only deployments per project policy — no prod promotes without explicit OK.
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cbd.restaurant" },
      { protocol: "https", hostname: "www.buckmountaincannabis.com" },
      { protocol: "https", hostname: "buckmountaincannabis.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },

  /**
   * Legacy URL bridge.
   *
   * Two old surfaces feed traffic into buckmountain.farm:
   *   1. Squarespace-era buckmountaincannabis.com — common Squarespace
   *      paths get aliased to our equivalents.
   *   2. cbd.restaurant BigCommerce product URLs — the rosin disposable
   *      vape SKU was the most-linked. Single redirect that catches the
   *      pattern.
   *
   * These activate when someone hits the path on buckmountain.farm itself.
   * For redirects on the OLD origin (buckmountaincannabis.com,
   * cbd.restaurant) you need to configure those servers separately — see
   * handoff/LEGACY_REDIRECTS.md.
   */
  async redirects() {
    return [
      // Squarespace conventions on the legacy site
      { source: "/products",          destination: "/strains",         permanent: true },
      { source: "/products/:slug*",   destination: "/strains/:slug*",  permanent: true },
      { source: "/shop",              destination: "/store",           permanent: true },
      { source: "/shop/:rest*",       destination: "/store",           permanent: true },
      { source: "/menu",              destination: "/strains",         permanent: true },
      { source: "/cart",              destination: "/store",           permanent: false },
      { source: "/account",           destination: "/loyalty/account", permanent: false },
      { source: "/login",             destination: "/api/auth/google", permanent: false },
      { source: "/sign-in",           destination: "/api/auth/google", permanent: false },
      { source: "/coa-library",       destination: "/coa",             permanent: true },
      { source: "/coas",              destination: "/coa",             permanent: true },
      { source: "/locator",           destination: "/wholesale",       permanent: true },
      { source: "/find-us",           destination: "/wholesale",       permanent: true },
      { source: "/where-to-buy",      destination: "/wholesale",       permanent: true },
      { source: "/instagram",         destination: "https://www.instagram.com/buckmountaincannabis/", permanent: false },
      { source: "/ig",                destination: "https://www.instagram.com/buckmountaincannabis/", permanent: false },

      // BigCommerce product slugs from cbd.restaurant. Path-to-regexp
      // doesn't allow splats right after a partial-word prefix, so we
      // enumerate the SKU URLs we know about. If new legacy URLs surface
      // in the Chrome MCP rip, add them here.
      { source: "/award-winning-rosin-half-gram-disposable-vape-pen", destination: "/strains/rosin-vape-half-gram", permanent: true },
      { source: "/cold-pressed-rosin-half-gram-disposable-vape-pen",  destination: "/strains/rosin-vape-half-gram", permanent: true },
      { source: "/disposable-vape-pen",                                destination: "/strains/rosin-vape-half-gram", permanent: true },
    ];
  },

  /**
   * Header-level noindex. Adds X-Robots-Tag for assets crawlers (PDFs,
   * images) that ignore meta robots. Pairs with app/robots.ts.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
    ];
  },
};

export default config;

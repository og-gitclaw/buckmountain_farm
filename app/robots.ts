/**
 * /robots.txt — defense-in-depth for the noindex directive.
 *
 * Disallow everything until Brendon flips public-launch. Meta robots
 * in layout.tsx already does this at the HTML level; this file gives
 * us the HTTP-served version too so crawlers that don't render JS still
 * see the block.
 *
 * Flip to allow-list when Randy approves: change disallow to ["/admin/", "/agent/", "/api/"]
 * and set host to the final canonical domain.
 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

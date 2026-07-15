/**
 * Auth gate for the staff surfaces — /admin, /agent, and their APIs.
 *
 * WHY THIS EXISTS (2026-07-15 audit):
 * Before this file, the ONLY thing in front of the entire back-office was
 * Vercel Deployment Protection. `PROD_PROMOTE.md` frames launch as "turn off
 * Deployment Protection" — which, without this middleware, would have exposed:
 *   - 7 of 9 app/admin/* pages with no gate at all
 *   - every app/agent/* page (app/agent/page.tsx even carried a
 *     "TODO(P3): wire actual session check" comment)
 *   - 5 unauthenticated mutation endpoints reachable by direct POST without
 *     ever loading a page: /api/admin/agents, /api/admin/drops,
 *     /api/admin/strain-updates, /api/agent/qr/request, /api/agent/visit-report
 * Only /admin/push-throttle (page + API) actually blocked anyone.
 *
 * NO NEW GATE INVENTED (per handoff/NEXT_SESSION.md §0 "Auth model"):
 * this reuses `verifySession()` + `SESSION_COOKIE_NAME` from lib/session.ts
 * verbatim. It reads the cookie off NextRequest instead of calling
 * `getSession()`, because `cookies()` from next/headers is not available in
 * middleware — the signature check itself is the same code path.
 *
 * RUNTIME: nodejs, not edge. lib/session.ts signs with `node:crypto`
 * (createHmac + timingSafeEqual), which the edge runtime does not provide.
 *
 * WHAT THIS DOES *NOT* DO:
 *   - It does not grant super-admin. `isSuperAdmin()` stays where it is
 *     (/admin/push-throttle page + API) — this only proves "a valid session
 *     exists". Authorization beyond that remains per-route.
 *   - It does not gate the Bearer-token machine endpoints (see MACHINE_ROUTES).
 *
 * FAIL-CLOSED: if SESSION_SECRET is unset, `verifySession()` returns null and
 * every staff route redirects to login. That is deliberate — a missing secret
 * must lock the door, not prop it open.
 */

import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Endpoints that authenticate themselves with `Authorization: Bearer <token>`
 * because a machine calls them, not a browser — the openclaw ingestor and the
 * dispensary scraper. Session-gating these would break those pipelines, and a
 * blanket "skip when an Authorization header is present" rule would let an
 * attacker bypass the gate by sending a junk header. So the skip is an exact
 * pathname allowlist, and each route still enforces its own token.
 *
 *   /api/admin/assets        POST  Bearer ADMIN_ASSET_INGEST_TOKEN
 *   /api/admin/dispensaries  GET   Bearer ADMIN_API_TOKEN
 *   /api/admin/qr-sheets     POST  Bearer ADMIN_ASSET_INGEST_TOKEN
 *   /api/agent/menu-placement POST Bearer ADMIN_ASSET_INGEST_TOKEN
 *
 * Their GET handlers return a static service descriptor (service/method/schema
 * — no data), so leaving those ungated leaks nothing.
 */
const MACHINE_ROUTES = new Set<string>([
  "/api/admin/assets",
  "/api/admin/dispensaries",
  "/api/admin/qr-sheets",
  "/api/agent/menu-placement",
]);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (MACHINE_ROUTES.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (session) return NextResponse.next();

  // API callers get a status code they can act on. Mirrors the existing
  // convention in app/api/admin/push-throttle/route.ts.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Page callers go to Google SSO and come back where they were headed.
  const returnTo = `${pathname}${search}`;
  const url = req.nextUrl.clone();
  url.pathname = "/api/auth/google";
  url.search = `?return_to=${encodeURIComponent(returnTo)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/api/admin/:path*", "/api/agent/:path*"],
};

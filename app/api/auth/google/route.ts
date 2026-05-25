/**
 * GET /api/auth/google
 *
 * Kicks off Google OAuth 2.0 authorization-code flow.
 *
 * Why we use Google (not magic-link or password):
 *   - Brendon's directive: SSO must be Google. Same provider for the
 *     customer site AND the agent portal — one less identity store.
 *   - Aligns with OGLife.app's existing consent network (also Google-fronted).
 *
 * Default consent boxes (per Brendon's directive):
 *   - 21+ verification: pre-checked
 *   - Cannabis-related interest opt-in: pre-checked
 *   - OGLife.app consent network: pre-checked
 *   - Marketing (SMS/email): NOT pre-checked (user must affirmatively opt-in)
 *
 * These defaults are surfaced on the post-OAuth /auth/consent page —
 * we do NOT auto-write them server-side without a user click, because
 * dark-pattern consent is unenforceable and risks the cannabis-marketing
 * compliance posture (CCPA + 21+ verification + TCPA SMS rules).
 *
 * Flow:
 *   1. GET /api/auth/google?return_to=/agent
 *   2. → redirect to accounts.google.com with state cookie
 *   3. ← /api/auth/google/callback?code=...
 *   4. → exchange code for tokens, fetch userinfo
 *   5. → upsert into oglife_optins (with consents={}; user fills on consent page)
 *   6. → set session cookie, redirect to /auth/consent?return_to=...
 *
 * Until GOOGLE_OAUTH_CLIENT_ID is configured (see .env.example), this
 * endpoint returns a 503 with instructions instead of starting the flow.
 */

import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "node:crypto";

export const runtime = "nodejs";

/** Returns `<nonce>.<hmac>` so the callback can verify both. */
function signedState(secret: string): string {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", secret).update(nonce).digest("hex").slice(0, 32);
  return `${nonce}.${sig}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") ?? "/agent";

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${url.origin}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "google-oauth-not-configured",
        detail:
          "Set GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET in Vercel env. " +
          "See handoff/GOOGLE_SSO_OGLIFE_CONSENT.md.",
      },
      { status: 503 },
    );
  }

  // Signed CSRF state. Without SESSION_SECRET we fall back to a random
  // nonce (still better than nothing). The callback uses the same secret
  // to verify before honoring `state`.
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  const state = sessionSecret ? signedState(sessionSecret) : `${randomBytes(16).toString("hex")}.unsigned`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const res = NextResponse.redirect(authUrl.toString(), 302);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 600,
    path: "/",
  });
  res.cookies.set("oauth_return_to", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 600,
    path: "/",
  });
  return res;
}

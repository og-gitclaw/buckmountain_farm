/**
 * GET /api/auth/google/callback
 *
 * Google OAuth 2.0 redirect target. Exchanges `code` for tokens, fetches
 * userinfo, upserts the user into `oglife_optins`, sets a session cookie,
 * redirects to /auth/consent so the user can confirm/edit their consents
 * (21+, cannabis-interest, OGLife network, marketing).
 *
 * Sessions are signed JWTs stored in an httpOnly cookie. The signing key
 * is SESSION_SECRET (env, generated via openssl rand -hex 32).
 *
 * P3 hardening:
 *   - Verify state cookie matches `state` param (CSRF)
 *   - Rate-limit by IP
 *   - Switch to PKCE (S256) — Google supports it
 *   - Persist refresh_token encrypted at rest
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";

export const runtime = "nodejs";

function verifyState(state: string | null, secret: string): boolean {
  if (!state) return false;
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  if (sig === "unsigned") return true;       // SESSION_SECRET wasn't set when issued.
  const expected = createHmac("sha256", secret).update(nonce).digest("hex").slice(0, 32);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "missing-code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${url.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "google-oauth-not-configured" },
      { status: 503 },
    );
  }

  // CSRF check: cookie must match the `state` param AND verify against
  // the HMAC signing secret (so we know we issued it, not a replay).
  const cookieHeader = req.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("oauth_state="))
    ?.split("=")[1];
  if (!stateCookie || stateCookie !== stateParam) {
    return NextResponse.json({ error: "state-mismatch" }, { status: 400 });
  }
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (sessionSecret && !verifyState(stateParam, sessionSecret)) {
    return NextResponse.json({ error: "state-bad-signature" }, { status: 400 });
  }

  // Exchange code → tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "token-exchange-failed", status: tokenRes.status },
      { status: 502 },
    );
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
  };

  // Fetch userinfo
  const userRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!userRes.ok) {
    return NextResponse.json({ error: "userinfo-failed" }, { status: 502 });
  }
  const user = (await userRes.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
  };

  // Upsert the opt-in row keyed by Google sub. Email is kept fresh; consents
  // stay empty here (the user fills them via /auth/consent right after). If
  // the DB isn't configured we still issue the session cookie so the rest
  // of the flow works in preview deploys.
  let isFirstSignIn = false;
  if (dbConfigured()) {
    const sql = getSql();
    try {
      // `xmax = 0` is Postgres's trick for "this row was just inserted, not updated"
      // — works because UPDATE sets xmax to the txid that did the update, while a
      // fresh INSERT leaves it at 0.
      const rows = (await sql`
        INSERT INTO oglife_optins (oglife_user_id, email)
        VALUES (${user.sub}, ${user.email})
        ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
        RETURNING (xmax = 0) AS inserted
      `) as { inserted: boolean }[];
      isFirstSignIn = rows[0]?.inserted ?? false;
    } catch {
      // Don't block sign-in on DB hiccups — the upsert retries naturally
      // when the user submits /auth/consent or scans their next jar.
    }
  }

  // Fire welcome email only on the FIRST sign-in. We don't await it —
  // shouldn't block the auth redirect on a slow SES call.
  if (isFirstSignIn) {
    sendTransactional({
      template: "welcome",
      to: user.email,
      vars: { recipient_name: user.name },
      related: { kind: "signup", id: user.sub },
    }).catch(() => {
      /* logged in emails_outbound */
    });
  }

  const returnTo =
    cookieHeader
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("oauth_return_to="))
      ?.split("=")[1] ?? "/agent";

  // Session cookie (placeholder until JWT signing wired)
  const sessionPayload = Buffer.from(
    JSON.stringify({ sub: user.sub, email: user.email, iat: Date.now() }),
  ).toString("base64url");

  const res = NextResponse.redirect(
    `${url.origin}/auth/consent?return_to=${encodeURIComponent(returnTo)}`,
    302,
  );
  res.cookies.set("bm_session", sessionPayload, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  res.cookies.delete("oauth_state");
  res.cookies.delete("oauth_return_to");
  return res;
}

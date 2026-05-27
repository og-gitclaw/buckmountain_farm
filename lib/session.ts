/**
 * Session helper — single source of truth for parsing and minting the
 * bm_session cookie.
 *
 * Cookie payload is a compact HS256 JWT signed with SESSION_SECRET:
 *   base64url(header).base64url(payload).base64url(hmac-sha256)
 *
 * Header is the fixed `{"alg":"HS256","typ":"JWT"}`. Payload claims:
 *   sub    Google OAuth subject (stable user id)
 *   email  user's verified email
 *   iat    issued-at, seconds since epoch (JWT-standard)
 *   exp    expiry, seconds since epoch (JWT-standard) — 30 days out
 *
 * Use:
 *   import { getSession, signSession } from "@/lib/session";
 *   const token = signSession({ sub, email });
 *   const s = await getSession();
 *   if (!s) redirect("/api/auth/google?return_to=...")
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export type Session = {
  sub: string;
  email: string;
  iat: number; // seconds since epoch
  exp: number; // seconds since epoch
};

const COOKIE = "bm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const HEADER_B64 = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url");

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

function constantTimeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signSession(
  payload: { sub: string; email: string },
  now: number = Math.floor(Date.now() / 1000),
): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not set");
  const body = b64urlJson({
    sub: payload.sub,
    email: payload.email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
  const signingInput = `${HEADER_B64}.${body}`;
  return `${signingInput}.${sign(signingInput, secret)}`;
}

export function verifySession(
  token: string,
  now: number = Math.floor(Date.now() / 1000),
): Session | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (header !== HEADER_B64) return null;
  const expected = sign(`${header}.${body}`, secret);
  if (!constantTimeEq(sig, expected)) return null;
  let claims: Partial<Session>;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<Session>;
  } catch {
    return null;
  }
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") return null;
  if (typeof claims.exp !== "number" || claims.exp < now) return null;
  const iat = typeof claims.iat === "number" ? claims.iat : 0;
  return { sub: claims.sub, email: claims.email, iat, exp: claims.exp };
}

export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(COOKIE);
  if (!c?.value) return null;
  return verifySession(c.value);
}

export async function requireSession(returnTo: string): Promise<Session> {
  const s = await getSession();
  if (s) return s;
  throw new Response(null, {
    status: 302,
    headers: { location: `/api/auth/google?return_to=${encodeURIComponent(returnTo)}` },
  });
}

export const SESSION_COOKIE_NAME = COOKIE;
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;

/**
 * Session helper — single source of truth for parsing the bm_session cookie.
 *
 * Today the cookie payload is `base64url(JSON({ sub, email, iat }))` (set by
 * /api/auth/google/callback). When we wire real JWT signing (P3), only this
 * file changes — every callsite keeps working.
 *
 * Use:
 *   import { getSession } from "@/lib/session";
 *   const s = await getSession();
 *   if (!s) redirect("/api/auth/google?return_to=...")
 */

import { cookies } from "next/headers";

export type Session = {
  sub: string;        // Google OAuth subject — stable user id
  email: string;
  iat: number;        // issued-at ms
};

const COOKIE = "bm_session";

export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(COOKIE);
  if (!c?.value) return null;
  try {
    const raw = Buffer.from(c.value, "base64url").toString("utf8");
    const obj = JSON.parse(raw) as Partial<Session>;
    if (typeof obj.sub !== "string" || typeof obj.email !== "string") return null;
    return { sub: obj.sub, email: obj.email, iat: Number(obj.iat) || 0 };
  } catch {
    return null;
  }
}

export async function requireSession(returnTo: string): Promise<Session> {
  const s = await getSession();
  if (s) return s;
  // Note: can't import redirect at module top — it's app-router-only.
  // Callers should check getSession() and call next/navigation's
  // redirect themselves; this helper exists for endpoints that throw.
  throw new Response(null, {
    status: 302,
    headers: { location: `/api/auth/google?return_to=${encodeURIComponent(returnTo)}` },
  });
}

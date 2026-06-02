/**
 * Super-admin allowlist.
 *
 * The "admin" role gates back-office features that any rep/manager can use.
 * Super-admin is a strict allowlist for features that are dangerous or
 * developer-only — fault injection into the push pipeline, future destructive
 * controls, etc. Two emails today; add more deliberately.
 *
 * Match is case-insensitive on the email's local part + host because Google
 * normalizes the case of the local part on delivery.
 */

import { getSession, type Session } from "@/lib/session";

const SUPER_ADMIN_EMAILS = new Set<string>([
  "mustwemuse@gmail.com",
  "bmdistributionllc@gmail.com",
]);

export function isSuperAdmin(session: Session | null | undefined): boolean {
  if (!session?.email) return false;
  return SUPER_ADMIN_EMAILS.has(session.email.toLowerCase());
}

export async function getSuperAdminSession(): Promise<Session | null> {
  const s = await getSession();
  return isSuperAdmin(s) ? s : null;
}

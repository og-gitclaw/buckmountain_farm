import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hostingLocked } from "./lifecycle";

/**
 * The hosting wall. Once the 30-day evaluation ends, an unpaid account can
 * still SIGN IN — but every admin surface funnels to /admin/billing until a
 * card is saved. The public site is deliberately never touched: taking a live
 * site down over a hosting invoice punishes the client's customers, not the
 * client. The wall on the tools is the leverage.
 *
 * Grace: a card that stops working (past_due) keeps full access for
 * GRACE_DAYS while the daily sweep retries and emails — an expired card
 * shouldn't lock anyone out the same morning. The lock test itself lives in
 * lifecycle.ts (hostingLocked) so harnesses can exercise it without pulling
 * in next/navigation.
 *
 * Exempt: the owner's own accounts (this is BM Distribution's wall — it must
 * never lock BM Distribution out), plus anything in BILLING_EXEMPT_EMAILS.
 * The two owner addresses are the same pair lib/super-admin.ts allowlists;
 * they are repeated here rather than imported so the wall keeps working if
 * that file's policy ever narrows.
 *
 * NOTE: with BILLING_ENABLED unset — the state this kit ships in —
 * hostingLocked() returns false unconditionally, so this is a no-op.
 */
const OWNER_EXEMPT = ["mustwemuse@gmail.com", "bmdistributionllc@gmail.com"];

function exemptEmails(): string[] {
  const extra = (process.env.BILLING_EXEMPT_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...OWNER_EXEMPT, ...extra];
}

/**
 * Call at the top of every gated admin page, after the session check.
 * Redirects to the payment center when the account is locked and the signed-in
 * email is the client's. Local development is never gated.
 */
export async function requireHostingAccess(email: string | null | undefined): Promise<void> {
  if (process.env.NODE_ENV === "development") return;
  const clean = (email ?? "").trim().toLowerCase();
  if (clean && exemptEmails().includes(clean)) return;
  if (await hostingLocked()) redirect("/admin/billing?locked=1");
}

/**
 * The one-liner every /admin page (except /admin/billing itself, which is
 * where the wall sends people) puts at the top of its component. middleware.ts
 * has already proven a session exists by the time this runs; the session is
 * read again only to find the email the exemption list is checked against.
 *
 * Deliberately NOT applied to /agent/*: the field-rep portal belongs to the
 * reps, and locking them out over the client's hosting invoice would punish
 * people who have nothing to do with the bill.
 */
export async function requireAdminHostingAccess(): Promise<void> {
  const session = await getSession();
  await requireHostingAccess(session?.email);
}

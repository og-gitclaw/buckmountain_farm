/**
 * Billing notices to the client's billing contact: add-a-card prompt, paid
 * receipt, failed-payment notice. Every attempt is written to message_log, so
 * the admin audit trail covers money too.
 *
 * ADAPTED FOR THIS SITE: the copy lives in lib/email/templates.ts (the
 * "billing-*" templates) and goes out through `sendTransactional()`, the
 * site's single SES entry point — same as every other email here. That means
 * a billing send also lands in `emails_outbound` with its SES message id.
 * message_log is written ANYWAY and on purpose: emails_outbound is the whole
 * site's delivery log and gets pruned, this is the money paper trail.
 */
import "server-only";
import { dbConfigured, getSql } from "@/lib/db";
import { sendTransactional } from "@/lib/email";
import { formatUsd } from "./plans";
import { STATEMENT_DESCRIPTOR, type Statement } from "./statement";

type SubInfo = { id: string; orgName: string; contactEmail: string };

async function log(template: string, recipient: string, ok: boolean, error?: string) {
  if (!dbConfigured()) return;
  try {
    const sql = getSql();
    await sql`
      INSERT INTO message_log (channel, template, recipient, ok, error)
      VALUES ('email', ${template}, ${recipient}, ${ok}, ${error ?? null})
    `;
  } catch (err) {
    console.error("[billing/emails] failed to write message_log:", err);
  }
}

/**
 * BILLING_CONTACT_EMAIL / MAIL_ADMIN_RECIPIENTS unset leaves nowhere to send.
 * Record the miss instead of handing the mailer an empty address.
 */
async function guardRecipient(template: string, to: string): Promise<boolean> {
  if (to.trim()) return true;
  console.error(`[billing/emails] ${template} not sent — no billing contact email is set.`);
  await log(template, "(none)", false, "no billing contact email configured");
  return false;
}

/**
 * Where the "add a card" button points. Absolute, because it is read in an
 * email client with no origin of its own.
 */
function billingLink(): string {
  const base = (process.env.BILLING_SITE_URL || "https://buckmountain.farm").replace(/\/+$/, "");
  return `${base}/admin/billing`;
}

function money(cents: number): string {
  return formatUsd(cents);
}

function lines(s: Statement): { label: string; amount: string }[] {
  return s.lines.map((l) => ({ label: l.label, amount: money(l.amountCents) }));
}

function day(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

/** Trial ended with no card saved — nothing has been charged. */
export async function sendCardNeededEmail(sub: SubInfo, monthlyCents: number): Promise<void> {
  const template = "billing-card-needed";
  if (!(await guardRecipient(template, sub.contactEmail))) return;
  const res = await sendTransactional({
    template,
    to: sub.contactEmail,
    vars: {
      org_name: sub.orgName,
      monthly_amount: money(monthlyCents),
      billing_url: billingLink(),
      statement_descriptor: STATEMENT_DESCRIPTOR,
    },
    related: { kind: "billing", id: sub.id },
  });
  await log(template, sub.contactEmail, res.ok, res.ok ? undefined : res.reason);
}

/** A payment went through. */
export async function sendReceiptEmail(
  sub: SubInfo,
  statement: Statement,
  chargeId: string | null,
): Promise<void> {
  const template = "billing-receipt";
  if (!(await guardRecipient(template, sub.contactEmail))) return;
  const res = await sendTransactional({
    template,
    to: sub.contactEmail,
    vars: {
      org_name: sub.orgName,
      total_amount: money(statement.totalCents),
      lines: lines(statement),
      paid_on: day(statement.periodStart),
      period_end: day(statement.periodEnd),
      charge_id: chargeId,
      billing_url: billingLink(),
      statement_descriptor: STATEMENT_DESCRIPTOR,
    },
    related: { kind: "billing", id: sub.id },
  });
  await log(template, sub.contactEmail, res.ok, res.ok ? undefined : res.reason);
}

/**
 * The card was declined. Sent at most once per escalation step (lifecycle
 * guards it with dunning_step), and the copy is honest about what happens
 * next for each decline kind — a held lane must not promise retries.
 */
export async function sendPaymentFailedEmail(
  sub: SubInfo,
  statement: Statement,
  reason: string,
  kind: "hard" | "fix_card" | "soft" = "soft",
): Promise<void> {
  const template = "billing-failed";
  if (!(await guardRecipient(template, sub.contactEmail))) return;
  const whatNext =
    kind === "fix_card"
      ? "The bank is rejecting a detail on the card — usually the billing ZIP code not " +
        "matching what the bank has on file. We've paused automatic retries. Re-save the " +
        "card on the billing page with the ZIP the bank has on record and billing resumes " +
        "on its own."
      : kind === "hard"
        ? "The bank says this card can't be charged. We've paused automatic retries — " +
          "adding a different card on the billing page fixes it."
        : "We'll retry automatically in a few days. Updating the card on the billing page " +
          "is the quickest fix if you'd rather not wait.";
  const res = await sendTransactional({
    template,
    to: sub.contactEmail,
    vars: {
      org_name: sub.orgName,
      total_amount: money(statement.totalCents),
      lines: lines(statement),
      reason,
      what_next: whatNext,
      billing_url: billingLink(),
      statement_descriptor: STATEMENT_DESCRIPTOR,
    },
    related: { kind: "billing", id: sub.id },
  });
  await log(template, sub.contactEmail, res.ok, res.ok ? undefined : res.reason);
}

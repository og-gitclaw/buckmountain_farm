/**
 * Builds the monthly statement — the line-item breakdown shown on the admin
 * billing page, snapshotted into billing_charges.line_items, and repeated in
 * the receipt email.
 *
 * Pure: pass it plain objects, get a plain object back. The snapshot is what
 * makes an old invoice stay truthful after a price or add-on changes.
 */
import { CYCLE_DAYS, formatUsd } from "./plans";

/** What the client's bank statement will actually say. */
export const STATEMENT_DESCRIPTOR = "BM Distribution LLC";

export type StatementLine = {
  code: string;
  label: string;
  amountCents: number;
};

export type Statement = {
  periodStart: Date;
  periodEnd: Date;
  lines: StatementLine[];
  totalCents: number;
};

type SubInput = { plan: string; monthlyCents: number };
type AddonInput = { code: string; label: string; monthlyCents: number; active?: boolean | null };

export function buildStatement(args: {
  sub: SubInput;
  addons: readonly AddonInput[];
  periodStart: Date;
}): Statement {
  const lines: StatementLine[] = [
    { code: args.sub.plan, label: "Website Care — monthly", amountCents: args.sub.monthlyCents },
  ];
  for (const a of args.addons) {
    if (a.active === false) continue;
    lines.push({ code: a.code, label: a.label, amountCents: a.monthlyCents });
  }
  const periodEnd = new Date(args.periodStart.getTime() + CYCLE_DAYS * 86_400_000);
  return {
    periodStart: args.periodStart,
    periodEnd,
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
  };
}

/** Shows up on the Clover charge and in the merchant dashboard. */
export function chargeDescription(orgName: string, periodStart: Date): string {
  return `${orgName} — website care, ${periodStart.toISOString().slice(0, 10)}`;
}

export function statementLinesText(s: Statement): string {
  return s.lines.map((l) => `${l.label}: ${formatUsd(l.amountCents)}`).join("\n");
}

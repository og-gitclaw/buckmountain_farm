/**
 * Subscription lifecycle for the one customer this site has: the client.
 *
 *   first run          → subscription seeded, 30-day trial starts, first
 *                        charge date set 30 days out (never sooner)
 *   card saved         → iframe token exchanged for a vaulted Clover card
 *   trial ends + card  → charged → active, next charge +30 days
 *   trial ends, no card→ pending_payment + one "add a card" email
 *   renewal due        → charged → next charge +30 days
 *   soft decline       → past_due; retried on a spaced ladder (declines.ts),
 *                        never more than the daily attempt cap
 *   hard/fix_card      → past_due with the retry lane HELD — nothing retries
 *                        until the card is saved again
 *
 * Every attempt — paid or declined — writes a billing_charges row with a
 * line-item snapshot. That ledger is the billing statement.
 *
 * HARD RULES (2026-08-24 incident on hbvets — six live auths in one evening):
 *   - at most MAX_ATTEMPTS_PER_DAY attempts reach Clover per day, all
 *     triggers combined, with a cooldown between them;
 *   - an attempt claims its ledger row BEFORE touching the network, so two
 *     racing invocations can never both charge;
 *   - a held lane (hard/fix_card decline) refuses even manual retries until
 *     the card changes.
 *
 * ADAPTED FOR THIS SITE: the reference kit is Drizzle; buckmountain.farm has
 * no ORM, it talks to Neon in raw SQL through lib/db.ts. So the reads here use
 * `getSql()` (the one-shot HTTP client) and THE MONEY PATH uses `getPool()` —
 * the WebSocket pool — because the HTTP client cannot do transactions at all.
 * That is not a style preference: runCycle() has to write the ledger row and
 * advance next_charge_at together (see the comment on the BEGIN below).
 */
import "server-only";
import { dbConfigured, getPool, getSql } from "@/lib/db";
import { chargeSubscription, vaultCard } from "./clover";
import {
  ATTEMPT_COOLDOWN_MS,
  MAX_ATTEMPTS_PER_DAY,
  MAX_RETRIES,
  classifyDecline,
  dunningStepFor,
  laneHoldMessage,
  nextRetryAt,
} from "./declines";
import { sendCardNeededEmail, sendPaymentFailedEmail, sendReceiptEmail } from "./emails";
import { AGENT_ADDONS, CYCLE_DAYS, TRIAL_DAYS, findAddon, monthlyTotalCents } from "./plans";
import { buildStatement, chargeDescription, type Statement, type StatementLine } from "./statement";

const ORG = { name: "Buck Mountain Cannabis" };

/** Comma-separated env allowlist of admin emails (billing-contact fallback). */
function adminEmails(): string[] {
  return [process.env.MAIL_ADMIN_RECIPIENTS, process.env.MAIL_ADMIN_BCC]
    .filter(Boolean)
    .flatMap((s) => (s as string).split(","))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const DAY_MS = 86_400_000;
const CYCLE_MS = CYCLE_DAYS * DAY_MS;

/**
 * Fixed rather than random: there is exactly ONE subscription here, and a
 * constant primary key lets two simultaneous first-page-loads race safely —
 * the loser's insert is a no-op instead of a duplicate customer.
 */
const SUB_ID = "sub_buckmountain_care";

/**
 * MASTER SWITCH. Billing is OFF unless `BILLING_ENABLED` is explicitly "1"
 * or "true".
 *
 * This exists because the kit ships to every site in the portfolio, but a
 * site is only *billable* once the client has actually agreed to pay. With
 * the switch off nothing is seeded, no trial clock starts, no dunning email
 * is ever sent, and the hosting wall can never lock anyone out — the payment
 * center just says it isn't turned on. Flipping the env var (plus a redeploy)
 * is what starts a client's 30 days.
 *
 * Default OFF is deliberate: a fresh deploy must never begin charging someone
 * by accident.
 */
export function billingEnabled(): boolean {
  const v = process.env.BILLING_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true";
}

function orgName(): string {
  return process.env.BILLING_ORG_NAME?.trim() || ORG.name;
}

function contactEmail(): string {
  return process.env.BILLING_CONTACT_EMAIL?.trim() || adminEmails()[0] || "";
}

/** Keeps the monthly anniversary while never leaving a charge date in the past. */
function advance(anchor: Date, now: Date): Date {
  let next = anchor.getTime();
  do {
    next += CYCLE_DAYS * DAY_MS;
  } while (next <= now.getTime());
  return new Date(next);
}

/** `sub_…-YYYY-MM-DD` — a subscription can never be billed twice in one day. */
export function idempotencyKeyFor(subId: string, day: Date): string {
  return `${subId}-${day.toISOString().slice(0, 10)}`;
}

// ── Row shapes ────────────────────────────────────────────────────────────
// Postgres hands back snake_case; the rest of the kit (and the reference
// implementation it was ported from) speaks camelCase. Map once, here, so a
// column rename can never leak into the pages.
//
// Timestamps: the neon driver parses timestamptz into Date, but the raw
// mapper coerces anyway — a string slipping through would turn
// `nextChargeAt.getTime()` into a crash on the money path.

export type SubscriptionRow = {
  id: string;
  orgName: string;
  contactEmail: string;
  plan: string;
  monthlyCents: number;
  status: string;
  trialStartedAt: Date;
  trialExpiresAt: Date;
  cardOnFile: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExp: string | null;
  cloverCustomerId: string | null;
  cloverSourceId: string | null;
  nextChargeAt: Date | null;
  lastChargeStatus: string | null;
  /** Failed automated attempts this delinquency; resets when a charge settles. */
  retryCount: number;
  /** When the sweep may try a soft-declined card again. Null = not scheduled. */
  nextRetryAt: Date | null;
  /** hard | fix_card — retry lane held until the card changes. Null = open. */
  lastDeclineKind: string | null;
  /** Highest failure-notice step already emailed; a re-decline on the same step is silent. */
  dunningStep: number;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AddonRow = {
  id: number;
  subscriptionId: string;
  code: string;
  label: string;
  monthlyCents: number;
  active: boolean;
  startedAt: Date;
  canceledAt: Date | null;
};

export type ChargeRow = {
  id: number;
  subscriptionId: string;
  cloverChargeId: string | null;
  amountCents: number;
  lineItems: unknown;
  periodStart: Date | null;
  periodEnd: Date | null;
  ok: boolean;
  reason: string | null;
  idempotencyKey: string | null;
  /** What fired this attempt: cron | manual | trial_end. */
  trigger: string | null;
  createdAt: Date;
};

type Raw = Record<string, unknown>;

function date(v: unknown): Date {
  return v instanceof Date ? v : new Date(String(v));
}
function dateOrNull(v: unknown): Date | null {
  return v == null ? null : date(v);
}
function str(v: unknown): string {
  return String(v ?? "");
}
function strOrNull(v: unknown): string | null {
  return v == null ? null : String(v);
}
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function toSub(r: Raw): SubscriptionRow {
  return {
    id: str(r.id),
    orgName: str(r.org_name),
    contactEmail: str(r.contact_email),
    plan: str(r.plan),
    monthlyCents: num(r.monthly_cents),
    status: str(r.status),
    trialStartedAt: date(r.trial_started_at),
    trialExpiresAt: date(r.trial_expires_at),
    cardOnFile: r.card_on_file === true,
    cardBrand: strOrNull(r.card_brand),
    cardLast4: strOrNull(r.card_last4),
    cardExp: strOrNull(r.card_exp),
    cloverCustomerId: strOrNull(r.clover_customer_id),
    cloverSourceId: strOrNull(r.clover_source_id),
    nextChargeAt: dateOrNull(r.next_charge_at),
    lastChargeStatus: strOrNull(r.last_charge_status),
    retryCount: num(r.retry_count),
    nextRetryAt: dateOrNull(r.next_retry_at),
    lastDeclineKind: strOrNull(r.last_decline_kind),
    dunningStep: num(r.dunning_step),
    canceledAt: dateOrNull(r.canceled_at),
    createdAt: date(r.created_at),
    updatedAt: date(r.updated_at),
  };
}

function toAddon(r: Raw): AddonRow {
  return {
    id: num(r.id),
    subscriptionId: str(r.subscription_id),
    code: str(r.code),
    label: str(r.label),
    monthlyCents: num(r.monthly_cents),
    active: r.active === true,
    startedAt: date(r.started_at),
    canceledAt: dateOrNull(r.canceled_at),
  };
}

function toCharge(r: Raw): ChargeRow {
  return {
    id: num(r.id),
    subscriptionId: str(r.subscription_id),
    cloverChargeId: strOrNull(r.clover_charge_id),
    amountCents: num(r.amount_cents),
    lineItems: r.line_items ?? null,
    periodStart: dateOrNull(r.period_start),
    periodEnd: dateOrNull(r.period_end),
    ok: r.ok === true,
    reason: strOrNull(r.reason),
    idempotencyKey: strOrNull(r.idempotency_key),
    trigger: strOrNull(r.trigger),
    createdAt: date(r.created_at),
  };
}

// ── Reading ───────────────────────────────────────────────────────────────

/** The client's subscription, seeded with a 30-day trial on first call. */
export async function getOrCreateSubscription(): Promise<SubscriptionRow | null> {
  if (!billingEnabled()) return null;
  if (!dbConfigured()) return null;
  const sql = getSql();

  const existing = (await sql`SELECT * FROM subscriptions WHERE id = ${SUB_ID} LIMIT 1`) as Raw[];
  if (existing[0]) return toSub(existing[0]);

  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + TRIAL_DAYS * DAY_MS);
  // next_charge_at is seeded to trial_expires_at: the first charge is the day
  // the trial ends — never sooner.
  await sql`
    INSERT INTO subscriptions
      (id, org_name, contact_email, status, trial_started_at, trial_expires_at, next_charge_at)
    VALUES
      (${SUB_ID}, ${orgName()}, ${contactEmail()}, 'trial', ${now.toISOString()},
       ${trialExpiresAt.toISOString()}, ${trialExpiresAt.toISOString()})
    ON CONFLICT (id) DO NOTHING
  `;

  const seeded = (await sql`SELECT * FROM subscriptions WHERE id = ${SUB_ID} LIMIT 1`) as Raw[];
  return seeded[0] ? toSub(seeded[0]) : null;
}

export type BillingSnapshot = {
  sub: SubscriptionRow;
  addons: AddonRow[];
  charges: ChargeRow[];
  monthlyTotalCents: number;
};

export async function getBillingSnapshot(): Promise<BillingSnapshot | null> {
  if (!dbConfigured()) return null;
  const sub = await getOrCreateSubscription();
  if (!sub) return null;
  const sql = getSql();

  const addons = ((await sql`
    SELECT * FROM subscription_addons
     WHERE subscription_id = ${sub.id}
     ORDER BY started_at DESC
  `) as Raw[]).map(toAddon);
  const charges = ((await sql`
    SELECT * FROM billing_charges
     WHERE subscription_id = ${sub.id}
     ORDER BY created_at DESC
     LIMIT 24
  `) as Raw[]).map(toCharge);

  const active = addons.filter((a) => a.active);
  return { sub, addons, charges, monthlyTotalCents: monthlyTotalCents(sub, active) };
}

async function activeAddons(subId: string): Promise<AddonRow[]> {
  if (!dbConfigured()) return [];
  const sql = getSql();
  return ((await sql`
    SELECT * FROM subscription_addons
     WHERE subscription_id = ${subId} AND active = true
  `) as Raw[]).map(toAddon);
}

async function findSubscription(subId: string): Promise<SubscriptionRow | null> {
  const sql = getSql();
  const rows = (await sql`SELECT * FROM subscriptions WHERE id = ${subId} LIMIT 1`) as Raw[];
  return rows[0] ? toSub(rows[0]) : null;
}

// ── Payment method ────────────────────────────────────────────────────────

export type ActionResult = { ok: boolean; error?: string };

/**
 * Exchange the iframe's single-use token for a vaulted card and store only the
 * ids plus what's safe to show. The card number never reaches this process.
 */
export async function attachCard(
  subId: string,
  token: string,
  hints: { brand?: string; last4?: string; exp?: string; clientIp?: string | null } = {},
): Promise<ActionResult> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't connected." };
  const sub = await findSubscription(subId);
  if (!sub) return { ok: false, error: "No subscription found." };

  const vaulted = await vaultCard(token, {
    email: sub.contactEmail,
    orgName: sub.orgName,
    clientIp: hints.clientIp,
  });
  if (!vaulted.ok || !vaulted.sourceId) {
    return { ok: false, error: vaulted.error ?? "The card could not be saved." };
  }

  const now = new Date();
  // These land in varchar(24)/varchar(4)/varchar(7) columns and the display
  // hints are client-supplied, so trim them to fit rather than let Postgres
  // reject the row after the card has already been vaulted at Clover.
  const brand = (vaulted.brand ?? hints.brand ?? "").trim().slice(0, 24) || null;
  const last4 = (vaulted.last4 ?? hints.last4 ?? "").replace(/\D/g, "").slice(-4) || null;
  const exp = (vaulted.exp ?? hints.exp ?? "").trim().slice(0, 7) || null;

  // A subscription waiting on a card has no charge date; give it one so the
  // next nightly sweep picks it up instead of stalling forever.
  const nextChargeAt =
    sub.status === "pending_payment" || sub.status === "past_due"
      ? (sub.nextChargeAt ?? now)
      : sub.nextChargeAt;

  const sql = getSql();
  await sql`
    UPDATE subscriptions
       SET card_on_file = true,
           card_brand = ${brand},
           card_last4 = ${last4},
           card_exp = ${exp},
           clover_customer_id = ${vaulted.customerId ?? null},
           clover_source_id = ${vaulted.sourceId},
           next_charge_at = ${nextChargeAt ? nextChargeAt.toISOString() : null},
           last_decline_kind = NULL,
           retry_count = 0,
           next_retry_at = NULL,
           updated_at = ${now.toISOString()}
     WHERE id = ${subId}
  `;
  // last_decline_kind/retry_count/next_retry_at: a saved card reopens a held
  // lane and restarts the ladder — the customer just fixed (or replaced) the
  // thing that was declining.

  return { ok: true };
}

export async function removeCard(subId: string): Promise<ActionResult> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't connected." };
  const sql = getSql();
  await sql`
    UPDATE subscriptions
       SET card_on_file = false,
           card_brand = NULL,
           card_last4 = NULL,
           card_exp = NULL,
           clover_customer_id = NULL,
           clover_source_id = NULL,
           last_decline_kind = NULL,
           retry_count = 0,
           next_retry_at = NULL,
           updated_at = ${new Date().toISOString()}
     WHERE id = ${subId}
  `;
  // No card, nothing to hold a lane against — the next saved card decides.
  return { ok: true };
}

// ── Add-ons ───────────────────────────────────────────────────────────────

export async function addAddon(subId: string, code: string): Promise<ActionResult> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't connected." };
  const item = findAddon(code);
  if (!item) return { ok: false, error: "That option isn't on the list." };
  const sql = getSql();

  const existing = (await sql`
    SELECT * FROM subscription_addons
     WHERE subscription_id = ${subId} AND code = ${code}
     LIMIT 1
  `) as Raw[];

  if (existing[0]) {
    const row = toAddon(existing[0]);
    if (row.active) return { ok: true };
    await sql`
      UPDATE subscription_addons
         SET active = true,
             canceled_at = NULL,
             started_at = ${new Date().toISOString()},
             label = ${item.label},
             monthly_cents = ${item.monthlyCents}
       WHERE id = ${row.id}
    `;
    return { ok: true };
  }

  await sql`
    INSERT INTO subscription_addons (subscription_id, code, label, monthly_cents)
    VALUES (${subId}, ${item.code}, ${item.label}, ${item.monthlyCents})
  `;
  return { ok: true };
}

export async function cancelAddon(subId: string, code: string): Promise<ActionResult> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't connected." };
  const sql = getSql();
  await sql`
    UPDATE subscription_addons
       SET active = false, canceled_at = ${new Date().toISOString()}
     WHERE subscription_id = ${subId} AND code = ${code}
  `;
  return { ok: true };
}

/**
 * Catalog + which entries are switched on, for the admin page. An add-on that
 * is already running shows the price STORED on it, not the catalog price, so
 * the screen can never quote a different number from the one the card is
 * charged after a price change.
 */
export function addonCatalogWith(addons: AddonRow[]) {
  const byCode = new Map(addons.map((a) => [a.code, a]));
  return AGENT_ADDONS.map((item) => {
    const row = byCode.get(item.code);
    const active = row?.active === true;
    return {
      ...item,
      active,
      monthlyCents: active ? row!.monthlyCents : item.monthlyCents,
    };
  });
}

// ── Charging ──────────────────────────────────────────────────────────────

type CycleResult = { charged: boolean; reason?: string };

/** What fired an attempt. Lands on the ledger row so the statement can say so. */
export type ChargeTrigger = "cron" | "manual" | "trial_end";

/**
 * One billing cycle: build the statement, claim a ledger row, charge, record
 * the outcome, move the subscription forward. A decline leaves nextChargeAt
 * where it is; the retry LADDER (not the calendar) decides when to try again.
 *
 * Guards, in order — every one of these was missing on 2026-08-24 when six
 * live authorizations hit a card in one evening (on hbvets):
 *   1. a held lane (hard/fix_card decline) refuses every trigger;
 *   2. at most MAX_ATTEMPTS_PER_DAY attempts per day, all triggers combined;
 *   3. a cooldown between attempts absorbs button-mashing;
 *   4. the ledger row is claimed BEFORE the network call, so two racing
 *      invocations can never both reach Clover.
 */
async function runCycle(
  sub: SubscriptionRow,
  dueAt: Date,
  now: Date,
  trigger: ChargeTrigger,
): Promise<CycleResult> {
  if (!dbConfigured()) return { charged: false, reason: "no database" };
  const sql = getSql();

  const hold = laneHoldMessage(sub.lastDeclineKind);
  if (hold) return { charged: false, reason: hold };

  // The month is paid in advance, so a due date that is already more than a
  // full cycle old — a card added weeks after the trial lapsed — starts its
  // paid month NOW. Billing from the stale date would charge for time already
  // gone and then charge again days later to catch the anniversary up.
  const anchor = dueAt.getTime() + CYCLE_MS <= now.getTime() ? now : dueAt;

  const addons = await activeAddons(sub.id);
  const statement: Statement = buildStatement({ sub, addons, periodStart: anchor });
  const baseKey = idempotencyKeyFor(sub.id, now);

  // Today's attempts, newest first. A settled one means a re-run — never
  // charge again. Failed ones must not block a retry, but each retry needs a
  // FRESH key (-rN): Clover replays the cached response for a key it has seen
  // (proven live 2026-08-24), and the ledger's unique index wants a new row.
  const today = ((await sql`
    SELECT * FROM billing_charges
     WHERE idempotency_key LIKE ${`${baseKey}%`}
     ORDER BY created_at DESC
  `) as Raw[]).map(toCharge);
  if (today.some((row) => row.ok)) {
    console.log(`[billing] ${sub.id} already charged under ${baseKey} — skipping.`);
    return { charged: false, reason: "already charged today" };
  }
  if (today.length >= MAX_ATTEMPTS_PER_DAY) {
    return {
      charged: false,
      reason:
        `Attempt limit reached — the card was already tried ${today.length} times today. ` +
        "It can be tried again tomorrow; updating the card is the faster fix.",
    };
  }
  const latest = today[0];
  if (latest && now.getTime() - latest.createdAt.getTime() < ATTEMPT_COOLDOWN_MS) {
    return {
      charged: false,
      reason: "A payment attempt just ran. Give it a couple of minutes before trying again.",
    };
  }
  const key = today.length === 0 ? baseKey : `${baseKey}-r${today.length}`;

  // Claim the ledger row BEFORE touching the network. Two racing invocations
  // compute the same key; the unique index (billing_charges_idem_key) lets
  // exactly one of them through.
  let claimId: number;
  try {
    const claimed = (await sql`
      INSERT INTO billing_charges
        (subscription_id, amount_cents, line_items, period_start, period_end,
         ok, reason, idempotency_key, trigger)
      VALUES
        (${sub.id}, ${statement.totalCents},
         ${JSON.stringify(statement.lines satisfies StatementLine[])}::jsonb,
         ${statement.periodStart.toISOString()}, ${statement.periodEnd.toISOString()},
         false, 'attempt in flight', ${key}, ${trigger})
      RETURNING id
    `) as Raw[];
    if (!claimed[0]) throw new Error("claim insert returned no row");
    claimId = num(claimed[0].id);
  } catch {
    return { charged: false, reason: "Another payment attempt is already running." };
  }

  const res = await chargeSubscription({
    sub,
    amountCents: statement.totalCents,
    idempotencyKey: key,
    description: chargeDescription(sub.orgName, anchor),
  });

  const kind = res.ok ? null : classifyDecline(res.reason);
  const newCount = sub.retryCount + 1;
  const step = kind ? dunningStepFor(newCount, kind) : 0;

  // ONE TRANSACTION, and therefore the WebSocket pool rather than the HTTP
  // client: a ledger row saying "paid" must never survive without the matching
  // next_charge_at move, or tomorrow's sweep charges again under a fresh day's
  // key. The neon HTTP driver has no transactions at all, so this is the one
  // place in the app that has to reach for getPool().
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE billing_charges
          SET clover_charge_id = $2,
              ok = $3,
              reason = $4
        WHERE id = $1`,
      [claimId, res.chargeId ?? null, res.ok, res.reason ?? null],
    );

    if (res.ok) {
      await client.query(
        `UPDATE subscriptions
            SET status = 'active',
                last_charge_status = $2,
                next_charge_at = $3,
                retry_count = 0,
                next_retry_at = NULL,
                last_decline_kind = NULL,
                dunning_step = 0,
                updated_at = $4
          WHERE id = $1`,
        [
          sub.id,
          `paid ${res.chargeId ?? ""}`.trim(),
          advance(anchor, now).toISOString(),
          now.toISOString(),
        ],
      );
      // A settle ends the delinquency: ladder + lane + dunning reset.
    } else {
      const retryAt = kind === "soft" ? nextRetryAt(newCount, now) : null;
      await client.query(
        `UPDATE subscriptions
            SET status = 'past_due',
                last_charge_status = $2,
                retry_count = $3,
                next_retry_at = $4,
                last_decline_kind = $5,
                dunning_step = $6,
                updated_at = $7
          WHERE id = $1`,
        [
          sub.id,
          `declined: ${res.reason ?? "unknown"}`,
          newCount,
          // Soft declines schedule the next rung; hard/fix_card hold the
          // lane (nothing retries until the card is saved again).
          retryAt ? retryAt.toISOString() : null,
          kind === "soft" ? null : kind,
          step > sub.dunningStep ? step : sub.dunningStep,
          now.toISOString(),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    // The money moved but our records didn't. Shout the reference so it can be
    // reconciled by hand in the Clover dashboard.
    console.error(
      `[billing] RECONCILE REQUIRED — charge ${res.ok ? "SUCCEEDED" : "failed"} for ${sub.id} ` +
        `(clover id ${res.chargeId ?? "none"}, key ${key}, ${statement.totalCents}¢) but the ` +
        "database write failed:",
      err,
    );
    return { charged: res.ok, reason: "recorded charge but database write failed" };
  } finally {
    client.release();
  }

  if (res.ok) {
    await sendReceiptEmail(sub, statement, res.chargeId ?? null);
    return { charged: true };
  }
  // One failure notice per escalation step, not per attempt — six declines in
  // an evening must not mean six emails.
  if (kind && step > sub.dunningStep) {
    await sendPaymentFailedEmail(sub, statement, res.reason ?? "the card was declined", kind);
  }
  if (kind === "soft" && newCount >= MAX_RETRIES) {
    console.warn(
      `[billing] ${sub.id}: retry ladder exhausted after ${newCount} attempts — needs a human.`,
    );
  }
  return { charged: false, reason: res.reason };
}

export type SweepSummary = {
  examined: number;
  charged: number;
  prompted: number;
  failed: number;
  skipped: number;
  notes: string[];
};

/**
 * Daily sweep. Safe to call repeatedly: the day's idempotency key plus the
 * ledger pre-check mean a second run in the same day charges nothing.
 */
export async function sweepBilling(): Promise<SweepSummary> {
  const summary: SweepSummary = {
    examined: 0,
    charged: 0,
    prompted: 0,
    failed: 0,
    skipped: 0,
    notes: [],
  };
  if (!billingEnabled()) {
    summary.notes.push("billing not enabled on this site (BILLING_ENABLED unset)");
    return summary;
  }
  if (!dbConfigured()) {
    summary.notes.push("no database");
    return summary;
  }
  const sql = getSql();

  await getOrCreateSubscription();
  const now = new Date();
  const all = ((await sql`SELECT * FROM subscriptions`) as Raw[]).map(toSub);

  for (const sub of all) {
    if (sub.status === "canceled") continue;
    summary.examined += 1;

    // One subscription blowing up must not abandon the rest of the sweep, and
    // must not leave the cron returning a 500 that hides what did happen.
    try {
      const trialOver = sub.status === "trial" && sub.trialExpiresAt.getTime() <= now.getTime();
      const chargeable = sub.cardOnFile && !!sub.cloverSourceId;

      if (trialOver) {
        if (!chargeable) {
          await sql`
            UPDATE subscriptions
               SET status = 'pending_payment', updated_at = ${now.toISOString()}
             WHERE id = ${sub.id}
          `;
          await sendCardNeededEmail(sub, monthlyTotalCents(sub, await activeAddons(sub.id)));
          summary.prompted += 1;
          continue;
        }
        const r = await runCycle(sub, now, now, "trial_end");
        if (r.charged) summary.charged += 1;
        else summary.failed += 1;
        continue;
      }

      const renewable =
        sub.status === "active" || sub.status === "past_due" || sub.status === "pending_payment";
      const anchor = sub.nextChargeAt;
      if (!renewable || !anchor || anchor.getTime() > now.getTime()) {
        summary.skipped += 1;
        continue;
      }
      if (!chargeable) {
        summary.skipped += 1;
        summary.notes.push(`${sub.id}: payment due, no card on file`);
        continue;
      }
      // A held lane never auto-retries — the customer has to fix the card.
      if (sub.lastDeclineKind) {
        summary.skipped += 1;
        summary.notes.push(
          `${sub.id}: retry lane held (${sub.lastDeclineKind} decline) — waiting on a card update`,
        );
        continue;
      }
      // Mid-delinquency, the LADDER decides when the next automated attempt
      // runs — not the calendar. The old behaviour (retry every single day
      // forever) meant a daily auth+reversal pair on the customer's bank.
      if (sub.retryCount > 0) {
        if (!sub.nextRetryAt) {
          summary.skipped += 1;
          summary.notes.push(
            `${sub.id}: retry ladder exhausted after ${sub.retryCount} attempts — needs a human`,
          );
          continue;
        }
        if (sub.nextRetryAt.getTime() > now.getTime()) {
          summary.skipped += 1;
          continue;
        }
      }

      const r = await runCycle(sub, anchor, now, "cron");
      if (r.charged) summary.charged += 1;
      else summary.failed += 1;
    } catch (err) {
      console.error(`[billing] sweep failed for ${sub.id}:`, err);
      summary.failed += 1;
      summary.notes.push(
        `${sub.id}: sweep error — ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return summary;
}

/** The "Try the payment again" button on a past-due statement. */
export async function retryChargeNow(subId: string): Promise<ActionResult> {
  if (!dbConfigured()) return { ok: false, error: "The database isn't connected." };
  const sub = await findSubscription(subId);
  if (!sub) return { ok: false, error: "No subscription found." };
  if (!sub.cardOnFile || !sub.cloverSourceId) {
    return { ok: false, error: "Add a card first — there's nothing to charge." };
  }

  const now = new Date();
  // Without this the button charges whenever it is invoked — mid-trial, or a
  // month early on a healthy account. It may only retry money that is already
  // owed.
  const due =
    sub.status === "past_due" ||
    sub.status === "pending_payment" ||
    (sub.status === "trial" && sub.trialExpiresAt.getTime() <= now.getTime()) ||
    (sub.status === "active" && !!sub.nextChargeAt && sub.nextChargeAt.getTime() <= now.getTime());
  if (!due) {
    return {
      ok: false,
      error: "Nothing is due right now — your next payment is already scheduled.",
    };
  }

  // The button skips the ladder's WAIT (a human may retry sooner) but never
  // its holds: lane, daily cap and cooldown are all enforced inside runCycle.
  const r = await runCycle(sub, sub.nextChargeAt ?? now, now, "manual");
  return r.charged
    ? { ok: true }
    : { ok: false, error: r.reason ?? "The payment didn't go through." };
}

/**
 * Is the account locked out of the admin tools? True once the 30-day
 * evaluation has ended with no card saved (pending_payment), or once a
 * failing card has exhausted its GRACE_DAYS of daily retries. Never locks on
 * a missing DB/subscription — a misconfig must not wall anyone.
 */
export const GRACE_DAYS = 7;

export async function hostingLocked(): Promise<boolean> {
  if (!billingEnabled()) return false;
  try {
    const snapshot = await getBillingSnapshot();
    if (!snapshot) return false;
    const { sub } = snapshot;
    if (sub.status === "pending_payment") return true;
    if (sub.status === "past_due" && sub.nextChargeAt) {
      const graceEnds = sub.nextChargeAt.getTime() + GRACE_DAYS * 86_400_000;
      return Date.now() > graceEnds;
    }
    return false;
  } catch (err) {
    // The wall sits in front of every admin page. A DB hiccup or an
    // unmigrated table must never be the reason the client can't get in.
    console.error("[billing] hostingLocked check failed — failing open:", err);
    return false;
  }
}

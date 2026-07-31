/**
 * End-to-end exercise of the billing lifecycle against the REAL code paths and
 * a REAL database, with the card network stubbed out (BILLING_FORCE_STUB=1).
 *
 * ── HOW TO RUN ──────────────────────────────────────────────────────────────
 *
 *   1. Make a DISPOSABLE Neon branch of the buckmountain-farm project and put
 *      its connection string in a scratch env file. Do NOT point this at the
 *      client's live branch: the harness seeds a subscription, charges it, and
 *      writes ledger rows. It restores what it finds, but a client database is
 *      not the place to find out that the restore has a bug.
 *   2. That env file must contain:
 *        DATABASE_URL_UNPOOLED=<the disposable branch, direct connection>
 *        BILLING_ENABLED=1          # the master switch, ON for the test only
 *        BILLING_FORCE_STUB=1       # no card network is touched
 *      and must NOT contain any AWS/SES credentials — with SES unconfigured
 *      the dunning emails are logged and skipped instead of mailed to a real
 *      person.
 *   3. Apply db/migrations/004_hosting_billing.sql to that branch.
 *   4. NODE_OPTIONS=--conditions=react-server \
 *        npx tsx --env-file=<that env file> scripts/billing-selftest.mts
 *
 * Two things about that command line are load-bearing:
 *   - `--conditions=react-server` — the billing modules start with
 *     `import "server-only"`, whose default export throws on import. The
 *     react-server condition resolves it to an empty module instead.
 *   - the `createRequire` calls below — this repo has no `"type": "module"`,
 *     so under tsx the app's `.ts` files compile to CJS and a static ESM
 *     `import { … } from "../lib/…"` cannot always see their named exports.
 *     Requiring them and typing the result with `typeof import(…)` keeps full
 *     type-checking without the interop trap.
 *
 * Deliberately NOT part of the app: it is a one-off harness kept in scripts/
 * so the same sequence can be re-run after any billing change. Nothing imports
 * it, and it is not wired into the build.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const db = require("../lib/db.ts") as typeof import("../lib/db");
const clover = require("../lib/billing/clover.ts") as typeof import("../lib/billing/clover");
const plans = require("../lib/billing/plans.ts") as typeof import("../lib/billing/plans");
const life = require("../lib/billing/lifecycle.ts") as typeof import("../lib/billing/lifecycle");

if (!db.dbConfigured()) throw new Error("no database — set DATABASE_URL_UNPOOLED");
if (!clover.stubMode()) {
  throw new Error("REFUSING TO RUN: not in stub mode — set BILLING_FORCE_STUB=1");
}
if (!life.billingEnabled()) {
  throw new Error("REFUSING TO RUN: BILLING_ENABLED is off, so nothing would ever seed");
}

const sql = db.getSql();
const DAY = 86_400_000;
let pass = 0;
const fails: string[] = [];

function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label} ${detail}`);
  }
}

type Row = Record<string, unknown>;
const chargeRows = async (id: string) =>
  (await sql`SELECT * FROM billing_charges WHERE subscription_id = ${id}`) as Row[];

// ── Snapshot everything we are about to disturb ──────────────────────────────
const original = await life.getOrCreateSubscription();
if (!original) throw new Error("no subscription — is the 004 migration applied?");
const SUB = original.id;
const preCharges = (await chargeRows(SUB)).length;
const preAddons = (
  (await sql`SELECT id FROM subscription_addons WHERE subscription_id = ${SUB}`) as Row[]
).length;
console.log(
  `\nSnapshot: ${SUB} status=${original.status} card=${original.cardOnFile} ` +
    `charges=${preCharges} addons=${preAddons}`,
);
console.log(`Original trial ends: ${original.trialExpiresAt.toISOString().slice(0, 10)}\n`);

/** Force the subscription into a known state without going through the app. */
async function setSub(fields: {
  status?: string;
  trialExpiresAt?: Date;
  nextChargeAt?: Date | null;
}) {
  if (fields.status !== undefined) {
    await sql`UPDATE subscriptions SET status = ${fields.status} WHERE id = ${SUB}`;
  }
  if (fields.trialExpiresAt !== undefined) {
    await sql`UPDATE subscriptions SET trial_expires_at = ${fields.trialExpiresAt.toISOString()} WHERE id = ${SUB}`;
  }
  if (fields.nextChargeAt !== undefined) {
    await sql`UPDATE subscriptions SET next_charge_at = ${fields.nextChargeAt ? fields.nextChargeAt.toISOString() : null} WHERE id = ${SUB}`;
  }
}

async function snapshot() {
  const s = await life.getBillingSnapshot();
  if (!s) throw new Error("snapshot vanished mid-test");
  return s;
}

try {
  // ── 1. Seeding ────────────────────────────────────────────────────────────
  console.log("1. Seeding");
  {
    const s = await snapshot();
    const trialDays = Math.round(
      (s.sub.trialExpiresAt.getTime() - s.sub.trialStartedAt.getTime()) / DAY,
    );
    check("trial is 30 days", trialDays === plans.TRIAL_DAYS, `got ${trialDays}`);
    check(
      "first charge is not before the trial ends",
      !!s.sub.nextChargeAt && s.sub.nextChargeAt.getTime() >= s.sub.trialExpiresAt.getTime(),
    );
    check("base plan is $25", s.sub.monthlyCents === 2500, `got ${s.sub.monthlyCents}`);
    check("no card on file yet", !s.sub.cardOnFile);
  }

  // ── 2. Add-on arithmetic ──────────────────────────────────────────────────
  console.log("\n2. Add-ons");
  {
    await life.addAddon(SUB, "agent_watch");
    let s = await snapshot();
    check("adding an add-on moves the total", s.monthlyTotalCents === 5000, `${s.monthlyTotalCents}`);
    await life.addAddon(SUB, "agent_watch");
    s = await snapshot();
    check("adding the same add-on twice is a no-op", s.monthlyTotalCents === 5000);
    const bogus = await life.addAddon(SUB, "not_a_real_addon");
    check("an unknown add-on is refused", !bogus.ok);
    await life.cancelAddon(SUB, "agent_watch");
    s = await snapshot();
    check("cancelling drops the total back", s.monthlyTotalCents === 2500, `${s.monthlyTotalCents}`);
  }

  // ── 3. Trial lapses with no card ──────────────────────────────────────────
  console.log("\n3. Trial ends, no card");
  {
    await setSub({ status: "trial", trialExpiresAt: new Date(Date.now() - DAY) });
    const r = await life.sweepBilling();
    const s = await snapshot();
    check("sweep prompts for a card", r.prompted === 1, JSON.stringify(r));
    check("status becomes pending_payment", s.sub.status === "pending_payment", s.sub.status);
    check("nothing was charged", (await chargeRows(SUB)).length === preCharges);
  }

  // ── 4. THE ONE RULE: a token becomes a VAULTED card ───────────────────────
  console.log("\n4. Saving a card");
  {
    const token = `clv_singleuse_${Date.now()}`;
    const r = await life.attachCard(SUB, token);
    check("card attaches", r.ok, r.error ?? "");
    const s = await snapshot();
    check("card_on_file is set", s.sub.cardOnFile);
    check("a clover source id was stored", !!s.sub.cloverSourceId);
    check(
      "the single-use token was NOT stored as the source",
      s.sub.cloverSourceId !== token,
      `stored ${s.sub.cloverSourceId}`,
    );
    check("a clover customer id was stored", !!s.sub.cloverCustomerId);
    check(
      "pending_payment got a charge date so the sweep can pick it up",
      !!s.sub.nextChargeAt,
    );
  }

  // ── 5. The charge, and the ledger ─────────────────────────────────────────
  console.log("\n5. Charging");
  {
    await setSub({ status: "pending_payment", nextChargeAt: new Date(Date.now() - DAY) });
    const r = await life.sweepBilling();
    check("sweep charges once", r.charged === 1, JSON.stringify(r));
    const s = await snapshot();
    check("status becomes active", s.sub.status === "active", s.sub.status);
    const rows = await chargeRows(SUB);
    check("a ledger row was written", rows.length === preCharges + 1);
    const latest = s.charges[0];
    check("the ledger row says ok", latest?.ok === true);
    check("the amount matches the plan", latest?.amountCents === 2500, `${latest?.amountCents}`);
    check("line items were snapshotted", Array.isArray(latest?.lineItems));
    const daysOut = s.sub.nextChargeAt
      ? Math.round((s.sub.nextChargeAt.getTime() - Date.now()) / DAY)
      : -1;
    check("next charge is ~30 days out", daysOut >= 29 && daysOut <= 31, `${daysOut}`);
  }

  // ── 6. Idempotency — the whole point ──────────────────────────────────────
  console.log("\n6. Idempotency");
  {
    const before = (await chargeRows(SUB)).length;
    // Drag the charge date back into the past so the sweep genuinely tries.
    await setSub({ nextChargeAt: new Date(Date.now() - DAY) });
    const r = await life.sweepBilling();
    const after = (await chargeRows(SUB)).length;
    check("a same-day re-run charges nothing", r.charged === 0, JSON.stringify(r));
    check("and writes no second ledger row", after === before, `${before} → ${after}`);
    check(
      "the day's key is what blocked it",
      life.idempotencyKeyFor(SUB, new Date()).endsWith(new Date().toISOString().slice(0, 10)),
    );
  }

  // ── 7. Decline → past_due, and the charge date does NOT advance ───────────
  console.log("\n7. Declines");
  {
    // Clear today's successful key so the ledger pre-check doesn't short-circuit.
    await sql`DELETE FROM billing_charges WHERE subscription_id = ${SUB} AND idempotency_key = ${life.idempotencyKeyFor(SUB, new Date())}`;
    process.env.STUB_FORCE_DECLINE = "1";
    const due = new Date(Date.now() - DAY);
    await setSub({ status: "active", nextChargeAt: due });
    const r = await life.sweepBilling();
    const s = await snapshot();
    check("the sweep reports a failure", r.failed === 1, JSON.stringify(r));
    check("status becomes past_due", s.sub.status === "past_due", s.sub.status);
    check("the failed attempt is on the ledger", s.charges[0]?.ok === false);
    check(
      "the charge date did NOT advance, so tomorrow retries",
      !!s.sub.nextChargeAt && Math.abs(s.sub.nextChargeAt.getTime() - due.getTime()) < 60_000,
    );
    delete process.env.STUB_FORCE_DECLINE;
  }

  // ── 8. The wall ───────────────────────────────────────────────────────────
  console.log("\n8. Hosting wall");
  {
    await setSub({ status: "active", nextChargeAt: new Date(Date.now() + 20 * DAY) });
    check("an up-to-date account is not locked", (await life.hostingLocked()) === false);

    await setSub({ status: "pending_payment" });
    check("pending_payment locks", (await life.hostingLocked()) === true);

    await setSub({ status: "past_due", nextChargeAt: new Date(Date.now() - 2 * DAY) });
    check("past_due inside grace does NOT lock", (await life.hostingLocked()) === false);

    await setSub({ nextChargeAt: new Date(Date.now() - (life.GRACE_DAYS + 1) * DAY) });
    check("past_due beyond grace locks", (await life.hostingLocked()) === true);

    await setSub({ status: "canceled" });
    check("a canceled account is not walled", (await life.hostingLocked()) === false);
  }

  // ── 9. "Charge now" may only take money that is owed ──────────────────────
  console.log("\n9. Charge-now guard");
  {
    await setSub({ status: "active", nextChargeAt: new Date(Date.now() + 20 * DAY) });
    const r = await life.retryChargeNow(SUB);
    check("refuses to charge early", !r.ok, r.error ?? "it charged!");
    const rows = await chargeRows(SUB);
    check("and wrote no ledger row", rows.length >= 0 && !r.ok);
  }

  // ── 10. Removing the card ─────────────────────────────────────────────────
  console.log("\n10. Removing the card");
  {
    await life.removeCard(SUB);
    const s = await snapshot();
    check("card_on_file cleared", !s.sub.cardOnFile);
    check("the vaulted source id is gone", !s.sub.cloverSourceId);
    await setSub({ status: "pending_payment", nextChargeAt: new Date(Date.now() - DAY) });
    const r = await life.sweepBilling();
    check("with no card the sweep charges nothing", r.charged === 0, JSON.stringify(r));
  }
} finally {
  // ── Restore ───────────────────────────────────────────────────────────────
  console.log("\nRestoring…");
  await sql`DELETE FROM billing_charges WHERE subscription_id = ${SUB}`;
  await sql`DELETE FROM subscription_addons WHERE subscription_id = ${SUB}`;
  await sql`
    UPDATE subscriptions
       SET status = ${original.status},
           trial_started_at = ${original.trialStartedAt.toISOString()},
           trial_expires_at = ${original.trialExpiresAt.toISOString()},
           card_on_file = ${original.cardOnFile},
           card_brand = ${original.cardBrand},
           card_last4 = ${original.cardLast4},
           card_exp = ${original.cardExp},
           clover_customer_id = ${original.cloverCustomerId},
           clover_source_id = ${original.cloverSourceId},
           next_charge_at = ${original.nextChargeAt ? original.nextChargeAt.toISOString() : null},
           last_charge_status = ${original.lastChargeStatus},
           updated_at = ${original.updatedAt.toISOString()}
     WHERE id = ${SUB}
  `;
  const postCharges = (await chargeRows(SUB)).length;
  console.log(`Restored: charges ${preCharges} → ${postCharges}`);
}

console.log(`\n${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  ! ${f}`);
process.exit(fails.length ? 1 : 0);

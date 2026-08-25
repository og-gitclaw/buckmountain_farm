/**
 * /admin/billing — the payment center.
 *
 * What the client pays for this website, what has been charged, and where the
 * card is saved. Styled with the same neutral-950 admin chrome as the rest of
 * /admin (see app/admin/page.tsx) — no shared AdminShell exists on this site,
 * so the <main> wrapper is repeated the way every other admin page repeats it.
 *
 * Auth: middleware.ts requires a valid session for all of /admin, so this page
 * is never reachable logged-out. The server actions re-check anyway.
 *
 * Dormant by default: with BILLING_ENABLED unset, getBillingSnapshot() returns
 * null, nothing is seeded, and this page says so instead of starting a trial.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { cloverEnv, stubMode } from "@/lib/billing/clover";
import { laneHoldMessage } from "@/lib/billing/declines";
import { addonCatalogWith, billingEnabled, getBillingSnapshot } from "@/lib/billing/lifecycle";
import { BASE_PLAN, formatUsd } from "@/lib/billing/plans";
import { STATEMENT_DESCRIPTOR } from "@/lib/billing/statement";
import { addAgentAddon, cancelAgentAddon, removeCardOnFile, retryPayment } from "./actions";
import { CardEditor } from "./parts";

export const metadata: Metadata = { title: "Admin — Billing" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHELL = "min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32";
const CARD = "rounded-lg border border-neutral-800 bg-neutral-900/50 p-6";
const EYEBROW = "text-xs uppercase tracking-[0.25em] text-amber-400/80";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function daysUntil(d: Date): number {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

type Line = { label?: unknown; amountCents?: unknown };

function describeLines(raw: unknown): string {
  if (!Array.isArray(raw)) return "Website Care — monthly";
  const labels = (raw as Line[])
    .map((l) => (typeof l.label === "string" ? l.label : null))
    .filter((l): l is string => !!l);
  return labels.length ? labels.join(" + ") : "Website Care — monthly";
}

function BackLink() {
  return (
    <nav className="max-w-4xl mx-auto mb-4 text-sm">
      <Link href="/admin" className="text-sky-400 hover:underline">
        ← Admin
      </Link>
    </nav>
  );
}

export default async function BillingPage() {
  if (!dbConfigured()) {
    return (
      <main className={SHELL}>
        <BackLink />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="mt-3 text-neutral-400">Database not configured on this deployment.</p>
        </div>
      </main>
    );
  }

  const snapshot = await getBillingSnapshot();
  if (!snapshot) {
    return (
      <main className={SHELL}>
        <BackLink />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="mt-3 text-neutral-400 max-w-2xl">
            {billingEnabled()
              ? "Billing isn't set up on this deployment yet."
              : "Hosting billing isn't switched on for this site. Nothing is being charged and no free trial is running."}
          </p>
        </div>
      </main>
    );
  }

  const { sub, addons, charges, monthlyTotalCents } = snapshot;
  const catalog = addonCatalogWith(addons);
  const activeAddons = catalog.filter((a) => a.active);
  const testMode = stubMode();
  // A live-looking deployment still wired to the sandbox would take pretend
  // money silently. Say so on the page rather than let it pass for real.
  const sandbox = !testMode && cloverEnv() === "sandbox";
  // A hard/fix_card decline holds the retry lane: retrying the same card
  // cannot succeed, and every attempt still puts a hold on the client's bank.
  const laneHold = laneHoldMessage(sub.lastDeclineKind);
  // Money is owed right now (trial over / renewal due / a decline to retry).
  const chargeDue = Boolean(
    !laneHold && sub.cardOnFile && sub.nextChargeAt && sub.nextChargeAt.getTime() <= Date.now(),
  );

  return (
    <main className={SHELL}>
      <BackLink />
      <div className="max-w-4xl mx-auto">
        <p className={EYEBROW}>Your account</p>
        <h1 className="text-3xl font-bold mt-2">Billing</h1>
        <p className="mt-2 text-neutral-400 text-sm max-w-2xl">
          Everything about what {sub.orgName} pays for this website, in one place. Nothing here is
          charged without a card saved below.
        </p>

        {/* ── Where the account stands right now ─────────────────────────── */}
        <StatusBanner
          status={sub.status}
          trialExpiresAt={sub.trialExpiresAt}
          nextChargeAt={sub.nextChargeAt}
          lastChargeStatus={sub.lastChargeStatus}
          cardOnFile={sub.cardOnFile}
          totalCents={monthlyTotalCents}
          laneHold={laneHold}
        />

        {/* ── The plan ───────────────────────────────────────────────────── */}
        <section className={`${CARD} mt-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={EYEBROW}>Your plan</p>
              <h2 className="text-2xl font-bold mt-1">{BASE_PLAN.label}</h2>
              <p className="mt-1 text-sm text-neutral-400 max-w-md">{BASE_PLAN.blurb}</p>
            </div>
            <p className="text-right">
              <span className="text-3xl font-bold text-amber-300">
                {formatUsd(sub.monthlyCents)}
              </span>
              <span className="block text-xs text-neutral-500">per month</span>
            </p>
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {BASE_PLAN.includes.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-neutral-200">
                <span className="text-amber-300" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Payment method ─────────────────────────────────────────────── */}
        <section className={`${CARD} mt-6`}>
          <p className={EYEBROW}>How you pay</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {sub.cardOnFile ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {(sub.cardBrand ?? "Card").toUpperCase()} •••• {sub.cardLast4 ?? "____"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {sub.cardExp ? `Expires ${sub.cardExp}` : "Saved for the monthly payment"}
                  </p>
                </div>
                <CardEditor hasCard />
                {chargeDue && (
                  // A payment is already owed and a card is saved — let the owner
                  // settle it now instead of waiting for the nightly sweep.
                  // retryChargeNow() re-checks that money is genuinely due, so
                  // this button can never charge early.
                  <form action={retryPayment}>
                    <button className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-neutral-200 transition">
                      Charge {formatUsd(monthlyTotalCents)} now
                    </button>
                  </form>
                )}
                <form action={removeCardOnFile}>
                  <button className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-rose-400/60 hover:text-neutral-100 transition">
                    Remove card
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-sm text-neutral-400">
                  No card saved yet. Nothing can be charged until one is added.
                </p>
                <CardEditor hasCard={false} />
              </>
            )}
          </div>
        </section>

        {/* ── Optional help ──────────────────────────────────────────────── */}
        <section className="mt-8">
          <p className={EYEBROW}>Extra help, if you want it</p>
          <h2 className="text-2xl font-bold mt-1">Add-on services</h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
            These are optional and go on the same monthly payment. Add one when you need it, cancel
            it when you don&apos;t — changes take effect on the next payment.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {catalog.map((item) => (
              <div
                key={item.code}
                className={`rounded-lg border p-5 ${
                  item.active
                    ? "border-amber-400/40 bg-amber-400/5"
                    : "border-neutral-800 bg-neutral-900/50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-lg">{item.label}</h3>
                  <p className="text-amber-300 font-bold whitespace-nowrap">
                    {formatUsd(item.monthlyCents)}
                    <span className="text-neutral-500 font-normal text-xs">/mo</span>
                  </p>
                </div>
                <p className="mt-2 text-sm text-neutral-400">{item.scope}</p>
                <div className="mt-4">
                  {item.active ? (
                    <form action={cancelAgentAddon}>
                      <input type="hidden" name="code" value={item.code} />
                      <span className="mr-3 text-xs uppercase tracking-wider text-amber-300">
                        Active
                      </span>
                      <button className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-rose-400/60 hover:text-neutral-100 transition">
                        Cancel this
                      </button>
                    </form>
                  ) : (
                    <form action={addAgentAddon}>
                      <input type="hidden" name="code" value={item.code} />
                      <button className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-amber-400/70 hover:text-amber-200 transition">
                        Add to my plan
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What it adds up to ─────────────────────────────────────────── */}
        <section className={`${CARD} mt-8`}>
          <p className={EYEBROW}>Your monthly total</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{BASE_PLAN.label}</dt>
              {/* The stored price, not the catalog price — this column has to add
                  up to the amount the card is actually charged. */}
              <dd>{formatUsd(sub.monthlyCents)}</dd>
            </div>
            {activeAddons.map((a) => (
              <div key={a.code} className="flex justify-between gap-4">
                <dt>{a.label}</dt>
                <dd>{formatUsd(a.monthlyCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-neutral-800 pt-3 mt-3">
              <dt className="font-bold">Total each month</dt>
              <dd className="text-2xl font-bold text-amber-300">
                {formatUsd(monthlyTotalCents)}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── History ────────────────────────────────────────────────────── */}
        <section className="mt-8">
          <p className={EYEBROW}>Your payments</p>
          <h2 className="text-2xl font-bold mt-1 mb-4">Billing history</h2>
          {charges.length === 0 ? (
            <div className={CARD}>
              <p className="text-sm text-neutral-400">
                No payments yet — your first invoice hasn&apos;t been issued.
                {sub.status === "trial" && (
                  <>
                    {" "}
                    It will appear here the day the free month ends, on{" "}
                    {fmtDate(sub.trialExpiresAt)}.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-500 text-left">
                  <tr className="border-b border-neutral-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">What it covered</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                      <td className="py-2 px-4 text-neutral-400 whitespace-nowrap">
                        {fmtDate(c.createdAt)}
                      </td>
                      <td className="py-2 px-4">
                        {describeLines(c.lineItems)}
                        {c.periodStart && c.periodEnd && (
                          <span className="block text-xs text-neutral-500">
                            {fmtDate(c.periodStart)} – {fmtDate(c.periodEnd)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right whitespace-nowrap">
                        {formatUsd(c.amountCents)}
                      </td>
                      <td className="py-2 px-4">
                        {c.ok ? (
                          <span className="text-emerald-300">Paid</span>
                        ) : (
                          <span className="text-rose-300">Didn&apos;t go through</span>
                        )}
                        {!c.ok && c.reason && (
                          <span className="block text-xs text-neutral-500 mt-1">{c.reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-8 text-xs text-neutral-500 max-w-2xl leading-relaxed">
          Payments appear on your bank or card statement as{" "}
          <span className="text-neutral-300">{STATEMENT_DESCRIPTOR}</span>. Your card details are
          held by our payment processor and never stored on this website. The monthly payment
          renews on its own; remove the card or email us any time to stop it.
          {testMode && (
            <>
              {" "}
              <span className="text-amber-300">
                Card processing is in test mode on this deployment — no real money moves.
              </span>
            </>
          )}
          {sandbox && (
            <>
              {" "}
              <span className="text-amber-300">
                Card processing is pointed at the processor&apos;s practice account — no real money
                moves.
              </span>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function StatusBanner({
  status,
  trialExpiresAt,
  nextChargeAt,
  lastChargeStatus,
  cardOnFile,
  totalCents,
  laneHold,
}: {
  status: string;
  trialExpiresAt: Date;
  nextChargeAt: Date | null;
  lastChargeStatus: string | null;
  cardOnFile: boolean;
  totalCents: number;
  laneHold: string | null;
}) {
  if (status === "past_due") {
    return (
      <div className="mt-8 rounded-lg border border-rose-500/40 bg-rose-500/10 p-6">
        <p className="text-xl font-bold">Your last payment didn&apos;t go through</p>
        <p className="mt-2 text-sm text-neutral-200 max-w-xl">
          {laneHold ??
            "Your site is still up and nothing extra has been charged. We'll retry automatically " +
              "in a few days — updating the card below is usually the quickest fix."}
        </p>
        <p className="mt-2 text-xs text-neutral-400 max-w-xl">
          A declined attempt can still show as a pending charge in your bank app — that hold was
          never collected and the bank releases it on its own.
        </p>
        {lastChargeStatus && <p className="mt-2 text-xs text-neutral-400">{lastChargeStatus}</p>}
        {/* A held lane hides the button entirely: retrying the same card cannot
            succeed, and every attempt still puts a hold on the client's bank. */}
        {!laneHold && (
          <form action={retryPayment} className="mt-4">
            <button className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition">
              Try the payment again
            </button>
            <p className="mt-2 text-xs text-neutral-400">Limited to a few attempts per day.</p>
          </form>
        )}
      </div>
    );
  }

  if (status === "pending_payment") {
    return (
      <div className="mt-8 rounded-lg border border-amber-400/40 bg-amber-400/5 p-6">
        <p className="text-xl font-bold">Your free month has ended</p>
        <p className="mt-2 text-sm text-neutral-200 max-w-xl">
          Add a card below to keep the site running. It&apos;s {formatUsd(totalCents)} a month.
          Nothing has been charged.
        </p>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-xl font-bold">This account is canceled</p>
        <p className="mt-2 text-sm text-neutral-400">No further payments will be taken.</p>
      </div>
    );
  }

  if (status === "trial") {
    const left = daysUntil(trialExpiresAt);
    return (
      <div className="mt-8 rounded-lg border border-amber-400/40 bg-amber-400/5 p-6">
        <p className="text-xl font-bold">Your first payment is on {fmtDate(trialExpiresAt)}</p>
        <p className="mt-2 text-sm text-neutral-200 max-w-xl">
          {`You have ${left} ${left === 1 ? "day" : "days"} left of your free month. On that date we'll charge `}
          {formatUsd(totalCents)}
          {cardOnFile
            ? " to the card below."
            : " — add a card below before then so nothing is interrupted."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-6">
      <p className="text-xl font-bold">Your account is up to date</p>
      <p className="mt-2 text-sm text-neutral-200">
        {nextChargeAt
          ? `Next payment: ${formatUsd(totalCents)} on ${fmtDate(nextChargeAt)}.`
          : `Your plan is ${formatUsd(totalCents)} a month.`}
      </p>
    </div>
  );
}

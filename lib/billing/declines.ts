/**
 * Decline classification + retry pacing.
 *
 * Born from the 2026-08-24 incident: six real $25 authorizations reached the
 * nonprofit's debit card in one evening — five of them within 14 seconds —
 * because a "retry" was allowed to hit the card network every time it was
 * invoked. An AVS-declined attempt still places a hold the customer's bank
 * shows before reversing it, so uncapped retries LOOK like being billed over
 * and over even though nothing settles.
 *
 * Three kinds of decline, three responses:
 *   hard     — the card itself is dead (stolen / closed / invalid). Never
 *              auto-retried; saving a new card reopens the lane.
 *   fix_card — the card is fine but a stored detail is wrong (billing ZIP,
 *              address, CVV mismatch). Retrying the SAME stored card cannot
 *              succeed, so it is held exactly like hard — but the message says
 *              what to fix. Re-saving the card reopens the lane.
 *   soft     — transient (insufficient funds / do-not-honor / issuer hiccup).
 *              Retried on a spaced ladder, at most MAX_RETRIES per
 *              delinquency, never more than the daily attempt cap allows.
 */
import "server-only";

export type DeclineKind = "hard" | "fix_card" | "soft";

/** Automated attempts per delinquency before a human has to look. */
export const MAX_RETRIES = 5;
/** Absolute per-day ceiling across every trigger (cron + buttons combined). */
export const MAX_ATTEMPTS_PER_DAY = 3;
/** Mash guard: minimum gap between two attempts reaching the network. */
export const ATTEMPT_COOLDOWN_MS = 2 * 60_000;

export function classifyDecline(reason: string | null | undefined): DeclineKind {
  const s = (reason ?? "").toLowerCase();
  // A detail on the stored card is wrong — same-card retries can never clear.
  const fixCard = /postal|zip|avs|address.*(mismatch|not match|does not)|cvv|cvc|security code|incorrect.*(number|expir)/;
  const hard =
    /stolen|lost.card|fraud|invalid|no such|not permitted|restricted|closed|expired|pick.?up|do not try again|revocation|blocked/;
  if (fixCard.test(s)) return "fix_card";
  if (hard.test(s)) return "hard";
  return "soft";
}

/** Why the retry lane is held, in words the owner can act on. Accepts the raw
 *  DB string — anything that isn't a known held kind reads as an open lane. */
export function laneHoldMessage(kind: string | null | undefined): string | null {
  if (kind === "fix_card") {
    return (
      "The bank is rejecting a detail on this card (usually the billing ZIP not matching " +
      "the bank's records). Automatic retries are paused — re-save the card with the " +
      "billing ZIP the BANK has on file, and billing resumes on its own."
    );
  }
  if (kind === "hard") {
    return "The bank says this card can't be charged at all. Automatic retries are paused — add a different card.";
  }
  return null;
}

/** The next 1st or 15th at 17:00 UTC, at least `minDaysOut` away. */
function nextPayday(from: Date, minDaysOut = 2): Date {
  const floor = new Date(from.getTime() + minDaysOut * 86_400_000);
  const candidates: Date[] = [];
  for (let m = 0; m <= 2; m += 1) {
    for (const day of [1, 15]) {
      candidates.push(new Date(Date.UTC(floor.getUTCFullYear(), floor.getUTCMonth() + m, day, 17)));
    }
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates.find((c) => c.getTime() >= floor.getTime()) ?? new Date(floor.getTime() + 14 * 86_400_000);
}

/**
 * When to attempt a SOFT-declined sub again. Early retries are quick
 * (transient issuer problems clear in days); later ones snap to the next
 * 1st/15th when accounts hold money. Null = ladder exhausted, needs a human.
 */
export function nextRetryAt(retryCount: number, from: Date): Date | null {
  if (retryCount >= MAX_RETRIES) return null;
  if (retryCount === 1) return new Date(from.getTime() + 3 * 86_400_000);
  if (retryCount === 2) return new Date(from.getTime() + 4 * 86_400_000);
  return nextPayday(from);
}

/**
 * Which escalation step a failure email belongs to; each step is sent at most
 * once per delinquency (subscriptions.dunning_step remembers the highest sent,
 * so re-declines on the same rung stay silent). Held lanes jump to step 2 —
 * "the card itself needs attention" — because waiting won't save them.
 */
export function dunningStepFor(retryCount: number, kind: DeclineKind): 1 | 2 | 3 | 4 {
  if (kind !== "soft") return retryCount >= 3 ? 4 : retryCount >= 2 ? 3 : 2;
  return Math.min(Math.max(retryCount, 1), 4) as 1 | 2 | 3 | 4;
}

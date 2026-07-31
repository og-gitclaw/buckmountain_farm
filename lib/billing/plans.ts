/**
 * What the Buck Mountain client is billed for.
 *
 * Pure data + arithmetic: no database, no network, no server-only import — the
 * admin page, the receipt emails, and the nightly charge sweep all price from
 * this one file so a number can never drift between the screen and the card.
 *
 * Money is integer cents everywhere. Format it with formatUsd() and nothing
 * else.
 */

/** Free days before the first charge. */
export const TRIAL_DAYS = 30;

/** Length of a billing cycle, in days. */
export const CYCLE_DAYS = 30;

export type Plan = {
  code: string;
  label: string;
  monthlyCents: number;
  blurb: string;
  includes: string[];
};

export const BASE_PLAN: Plan = {
  code: "care",
  label: "Website Care",
  monthlyCents: 2500,
  blurb: "Everything it takes to keep buckmountain.farm online, safe, and current.",
  includes: [
    "Hosting, the secure certificate, and the domain pointed where it belongs",
    "The admin back-office, the agent portal, and the strain-update feed",
    "QR authenticity scans, the loyalty ledger, and the rewards flow",
    "Drop announcements by email, text, and push notification",
    "Security patches and software updates",
    "Nightly backups of every page and record",
    "Email support when something looks wrong",
  ],
};

export type AgentAddon = {
  code: string;
  label: string;
  monthlyCents: number;
  /** One honest line about what this tier actually covers. */
  scope: string;
};

/**
 * Optional help beyond keeping the lights on. These are staffed tiers, so the
 * scope lines are deliberately concrete — an add-on should never promise more
 * than the hours behind it.
 */
export const AGENT_ADDONS: readonly AgentAddon[] = [
  {
    code: "agent_watch",
    label: "Light monitoring",
    monthlyCents: 2500,
    scope:
      "We watch the site, the scan pipeline, and the inbox daily and tell you if something breaks or a message goes unanswered.",
  },
  {
    code: "agent_updates",
    label: "Content updates",
    monthlyCents: 7500,
    scope:
      "Up to a few hours a month of real page work — new strains, new drops, fresh photos, rewritten sections, COAs posted.",
  },
  {
    code: "agent_campaigns",
    label: "Ongoing campaigns",
    monthlyCents: 15000,
    scope:
      "Content updates plus a running customer campaign: drop emails and texts written and sent, landing pages, results reported back.",
  },
  {
    code: "agent_full_ops",
    label: "Full operations",
    monthlyCents: 25000,
    scope:
      "We run the whole digital side — site, email, campaigns, dispensary reporting — and meet with you monthly. Effectively a part-time staffer.",
  },
] as const;

export function findAddon(code: string): AgentAddon | undefined {
  return AGENT_ADDONS.find((a) => a.code === code);
}

/** Anything with a monthly price and an on/off switch. */
type AddonLike = { monthlyCents: number; active?: boolean | null };
type PlanLike = { monthlyCents: number };

/** Base plan + every ACTIVE add-on. The one number the card is charged. */
export function monthlyTotalCents(sub: PlanLike, addons: readonly AddonLike[]): number {
  return addons.reduce(
    (sum, a) => (a.active === false ? sum : sum + a.monthlyCents),
    sub.monthlyCents,
  );
}

/** The only place cents become a dollar string. */
export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Loyalty rewards catalog — what points can be redeemed for.
 *
 * Static for now (no admin CRUD yet). Each reward is a fixed token cost;
 * redeeming writes a negative rewards_ledger entry with reason
 * `redeem:<id>`. Keep costs in sync with whatever Brendon decides the
 * scan economy is worth (currently 10 tokens/scan in the claim flow).
 */

export type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number; // tokens
};

export const REWARDS: Reward[] = [
  {
    id: "sticker-pack",
    name: "Buck Mountain sticker pack",
    description: "Die-cut logo + Always Grinding stickers, mailed to you.",
    cost: 50,
  },
  {
    id: "tee",
    name: "Always Grinding tee",
    description: "Buck Mountain tee, claim in-store or at a drop.",
    cost: 250,
  },
  {
    id: "tech-deck",
    name: "Buck Mountain Tech Deck",
    description: "Limited fingerboard from the merch drop.",
    cost: 400,
  },
];

export function getReward(id: string): Reward | undefined {
  return REWARDS.find((r) => r.id === id);
}

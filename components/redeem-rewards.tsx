"use client";

/**
 * Redeem-points control for /loyalty/account.
 *
 * Renders the static REWARDS catalog; each row is redeemable when the
 * balance covers its cost. Posts to /api/loyalty/redeem, which does the
 * overdraw-safe debit server-side. On success we optimistically drop the
 * local balance so the affordability of the other rewards updates without
 * a reload; a router.refresh() re-syncs the server-rendered balance.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REWARDS } from "@/data/rewards";

export function RedeemRewards({ balance }: { balance: number }) {
  const router = useRouter();
  const [current, setCurrent] = useState(balance);
  const [pending, setPending] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function redeem(id: string, cost: number, name: string) {
    setPending(id);
    setMsg(null);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reward_id: id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        balance?: number;
        error?: string;
      };
      if (res.ok && body.ok) {
        setCurrent(body.balance ?? current - cost);
        setMsg({ kind: "ok", text: `Redeemed ${name}. We’ll be in touch on fulfillment.` });
        router.refresh();
      } else if (body.error === "insufficient-points") {
        setMsg({ kind: "err", text: "Not enough points for that yet." });
      } else {
        setMsg({ kind: "err", text: "Couldn’t redeem — try again." });
      }
    } catch {
      setMsg({ kind: "err", text: "Network error — try again." });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {msg && (
        <p
          className={`text-sm ${
            msg.kind === "ok" ? "text-emerald-200" : "text-rose-300"
          }`}
        >
          {msg.text}
        </p>
      )}
      <ul className="space-y-2">
        {REWARDS.map((r) => {
          const affordable = current >= r.cost;
          return (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-white/50 truncate">
                  {r.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => redeem(r.id, r.cost, r.name)}
                disabled={!affordable || pending !== null}
                className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold hover:border-white/40 disabled:opacity-40 disabled:hover:border-white/20"
              >
                {pending === r.id ? "…" : `${r.cost} pts`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * POST /api/loyalty/redeem  { reward_id }
 *
 * Spends points on a catalog reward. Requires a session.
 *
 * Overdraw-safe: the balance is summed and the debit row is inserted
 * inside one BEGIN/COMMIT over the WebSocket pool, with the user's ledger
 * rows locked FOR UPDATE so two concurrent redeems can't both pass the
 * balance check. The rewards_ledger CHECK (delta_tokens <> 0) plus our
 * own balance guard mean a redeem never drives the balance negative.
 *
 * The redemption is recorded as a negative ledger entry with reason
 * `redeem:<reward_id>`; fulfillment (mailing the sticker pack, etc.) is a
 * manual/admin step keyed off that reason — no separate fulfillment table
 * yet.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dbConfigured, getPool } from "@/lib/db";
import { getReward } from "@/data/rewards";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") ?? "";
  let reward_id = "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;
    reward_id = body.reward_id ?? "";
  } else {
    const form = await req.formData();
    reward_id = String(form.get("reward_id") ?? "");
  }

  const reward = getReward(reward_id);
  if (!reward) {
    return NextResponse.json({ error: "unknown-reward" }, { status: 422 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      { error: "database-not-configured" },
      { status: 503 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const optin = await client.query(
      `INSERT INTO oglife_optins (oglife_user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (oglife_user_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [session.sub, session.email],
    );
    const optin_id: number = optin.rows[0].id;

    // Lock this user's ledger rows so a concurrent redeem can't read the
    // same balance and double-spend.
    const bal = await client.query(
      `SELECT COALESCE(SUM(delta_tokens), 0)::int AS balance
         FROM rewards_ledger
        WHERE optin_id = $1
        FOR UPDATE`,
      [optin_id],
    );
    const balance: number = bal.rows[0].balance;

    if (balance < reward.cost) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "insufficient-points", balance, cost: reward.cost },
        { status: 409 },
      );
    }

    await client.query(
      `INSERT INTO rewards_ledger (optin_id, delta_tokens, reason)
       VALUES ($1, $2, $3)`,
      [optin_id, -reward.cost, `redeem:${reward.id}`],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        ok: true,
        reward_id: reward.id,
        spent: reward.cost,
        balance: balance - reward.cost,
      },
      { status: 200 },
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const msg = err instanceof Error ? err.message : "redeem-failed";
    return NextResponse.json({ error: "redeem-failed", detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

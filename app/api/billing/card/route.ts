import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { attachCard, getOrCreateSubscription, removeCard } from "@/lib/billing/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? (fwd.split(",")[0]?.trim() ?? null) : null;
}

/**
 * Saves the card on file. The body carries a single-use token produced inside
 * Clover's iframe — the card number itself never reaches this route, and the
 * token is exchanged for a vaulted card before anything is stored.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!(await getSession())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    token?: unknown;
    brand?: unknown;
    last4?: unknown;
    exp?: unknown;
  };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "No card token was received." }, { status: 400 });

  const sub = await getOrCreateSubscription();
  if (!sub) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });

  // Display-only hints from the tokenizer; never used to charge anything, and
  // trimmed to the width of the columns they land in — these are client-sent
  // strings and an over-long one would fail the write AFTER the card had
  // already been vaulted at Clover.
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined;
  const digits = (v: unknown) =>
    typeof v === "string" ? v.replace(/\D/g, "").slice(-4) || undefined : undefined;

  try {
    const res = await attachCard(sub.id, token, {
      brand: str(body.brand, 24),
      last4: digits(body.last4),
      exp: str(body.exp, 7),
      clientIp: clientIp(req),
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.error ?? "Card not saved." }, { status: 400 });
    }
  } catch (err) {
    console.error("[billing] attachCard failed:", err);
    return NextResponse.json(
      { error: "The card couldn't be saved just now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** Removes the card on file. Nothing is charged after this until a new one is added. */
export async function DELETE(): Promise<NextResponse> {
  if (!(await getSession())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sub = await getOrCreateSubscription();
  if (!sub) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  const res = await removeCard(sub.id);
  if (!res.ok) return NextResponse.json({ error: res.error ?? "Card not removed." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

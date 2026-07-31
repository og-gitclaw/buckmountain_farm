/**
 * Clover Ecommerce client for the monthly subscription charge.
 *
 * THE ONE RULE THAT MATTERS: the token the hosted iframe hands us is
 * SINGLE-USE. Charging a stored `clv_` token works in month 1 and declines in
 * month 2. It has to be exchanged for a vaulted card before we ever schedule a
 * renewal — that exchange is vaultCard() below.
 *
 * Shapes verified against Clover's Ecommerce API docs (docs.clover.com,
 * "Save a card for future transactions" / "Create a charge", July 2026):
 *
 *   POST {base}/v1/customers
 *     → { "email": "…", "firstName": "…", "lastName": "…", "source": "clv_…" }
 *     ← { "id": "PWG98TV2ECTT2", "object": "customer",
 *         "sources": { "object": "list", "data": ["8YTCARDXSQHP0"] } }
 *     The docs' literal example returns bare card ids in sources.data; other
 *     Clover responses return card OBJECTS ({ id, brand, last4, exp_month,
 *     exp_year, first6 }). We read both shapes rather than betting on one.
 *
 *   POST {base}/v1/charges
 *     → { "amount": 2500, "currency": "usd", "source": "<vaulted card id>",
 *         "capture": true, "ecomind": "ecom",
 *         "stored_credentials": { "sequence": "SUBSEQUENT",
 *                                 "is_scheduled": true,
 *                                 "initiator": "MERCHANT" } }
 *     ← { "id": "PQ7XWMJ4Y4P1Y", "status": "succeeded", "paid": true, … }
 *     The createcharge reference lists NO `customer` body parameter — the
 *     vaulted SOURCE id is what a renewal charges. We still store the customer
 *     id so a charge can be traced back in the Clover dashboard.
 *
 * Headers: `authorization: Bearer <private token>`, `idempotency-key` on every
 * charge, and `x-forwarded-for` — which Clover asks for on all charge requests.
 * A cron renewal has no browser behind it, so CLOVER_MERCHANT_IP supplies the
 * originating address for merchant-initiated charges; without it the header is
 * omitted rather than faked.
 *
 * STUB MODE (no creds, or BILLING_FORCE_STUB=1): logs and returns a synthetic
 * success without a single network call, so the whole trial → card → renewal
 * flow is testable before a merchant account exists.
 */
import "server-only";

const API_BASE: Record<string, string> = {
  production: "https://scl.clover.com",
  sandbox: "https://scl-sandbox.dev.clover.com",
};

export function cloverConfigured(): boolean {
  return !!(process.env.CLOVER_API_TOKEN?.trim() && process.env.CLOVER_MERCHANT_ID?.trim());
}

/** True when no card network is touched. */
export function stubMode(): boolean {
  // BILLING_FORCE_STUB, and deliberately nothing else. If /store ever grows a
  // real checkout it will bring its own stub switch; hosting billing must
  // never share one, or stubbing the storefront would silently stop the
  // hosting invoice (or worse, un-stub it).
  return process.env.BILLING_FORCE_STUB === "1" || !cloverConfigured();
}

export function cloverEnv(): "production" | "sandbox" {
  if (process.env.CLOVER_ENV?.trim() === "sandbox") return "sandbox";
  if (process.env.CLOVER_API_BASE?.includes("sandbox")) return "sandbox";
  return process.env.CLOVER_ENV?.trim() === "production" ? "production" : "sandbox";
}

function apiBase(): string {
  return process.env.CLOVER_API_BASE?.trim() || API_BASE[cloverEnv()];
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${process.env.CLOVER_API_TOKEN!.trim()}`,
    ...extra,
  };
}

/** Clover wants the originating IP on charges; a cron has none of its own. */
function originIp(clientIp?: string | null): string | null {
  const ip = clientIp?.trim() || process.env.CLOVER_MERCHANT_IP?.trim();
  return ip || null;
}

type CardShape = {
  id?: string;
  token?: string;
  brand?: string;
  last4?: string;
  exp_month?: string | number;
  exp_year?: string | number;
};

type CustomerShape = {
  id?: string;
  sources?: { data?: unknown[] } | unknown[];
  error?: { message?: string };
  message?: string;
};

function sourceList(json: CustomerShape): unknown[] {
  if (Array.isArray(json.sources)) return json.sources;
  const data = (json.sources as { data?: unknown[] } | undefined)?.data;
  return Array.isArray(data) ? data : [];
}

/** sources.data holds either bare card ids or full card objects. */
function readCard(entry: unknown): { id: string | null; card: CardShape } {
  if (typeof entry === "string") return { id: entry, card: {} };
  if (entry && typeof entry === "object") {
    const c = entry as CardShape;
    return { id: c.id ?? c.token ?? null, card: c };
  }
  return { id: null, card: {} };
}

function expString(card: CardShape): string | null {
  if (!card.exp_month || !card.exp_year) return null;
  const mm = String(card.exp_month).padStart(2, "0");
  const yyyy = String(card.exp_year);
  return `${mm}/${yyyy}`.slice(0, 7);
}

export type VaultResult = {
  ok: boolean;
  stub?: boolean;
  customerId?: string;
  /** The REUSABLE card id. This — never the iframe token — is what renewals charge. */
  sourceId?: string;
  brand?: string;
  last4?: string;
  exp?: string;
  error?: string;
};

/**
 * Exchange a single-use iframe token for a vaulted card on a Clover customer.
 * Refuses to report success without a reusable source id: storing the raw
 * token instead would bill fine this month and decline every month after.
 */
export async function vaultCard(
  token: string,
  opts: { email?: string; orgName?: string; clientIp?: string | null } = {},
): Promise<VaultResult> {
  if (!token.trim()) return { ok: false, error: "No card token was received." };

  if (stubMode()) {
    console.log(`[clover:stub] vaultCard — no network call (token ${token.slice(0, 8)}…)`);
    return {
      ok: true,
      stub: true,
      customerId: `stubcus_${Date.now().toString(36)}`,
      sourceId: `stubsrc_${Date.now().toString(36)}`,
      brand: "VISA",
      last4: "4242",
      exp: "12/2030",
    };
  }

  const name = (opts.orgName ?? "").trim().split(/\s+/);
  const ip = originIp(opts.clientIp);
  let json: CustomerShape;
  let status: number;
  try {
    const res = await fetch(`${apiBase()}/v1/customers`, {
      method: "POST",
      headers: authHeaders(ip ? { "x-forwarded-for": ip } : {}),
      body: JSON.stringify({
        email: opts.email,
        firstName: name[0] || "Website",
        lastName: name.slice(1).join(" ") || "Subscriber",
        source: token,
      }),
    });
    status = res.status;
    json = (await res.json().catch(() => ({}))) as CustomerShape;
  } catch (e) {
    console.error("[clover] vaultCard network error:", e);
    return { ok: false, error: "Could not reach the card processor. Please try again." };
  }

  if (status < 200 || status >= 300 || !json.id) {
    const detail = json.error?.message ?? json.message ?? `clover-${status}`;
    console.error(`[clover] vaultCard failed: ${detail}`);
    return { ok: false, error: `The card could not be saved (${detail}).` };
  }

  let { id: sourceId, card } = readCard(sourceList(json)[0]);

  // The create response occasionally comes back before the card is listed;
  // re-read the customer once rather than fall back to the single-use token.
  if (!sourceId) {
    try {
      const res = await fetch(`${apiBase()}/v1/customers/${json.id}`, { headers: authHeaders() });
      const fresh = (await res.json().catch(() => ({}))) as CustomerShape;
      ({ id: sourceId, card } = readCard(sourceList(fresh)[0]));
    } catch (e) {
      console.error("[clover] vaultCard re-read failed:", e);
    }
  }

  if (!sourceId) {
    console.error(
      `[clover] RECONCILE: customer ${json.id} was created but returned no reusable card id — ` +
        "the card was NOT stored for renewals.",
    );
    return {
      ok: false,
      error: "The card was accepted but not saved for future months. Please try again.",
    };
  }

  return {
    ok: true,
    customerId: json.id,
    sourceId,
    brand: card.brand ?? undefined,
    last4: card.last4 ?? undefined,
    exp: expString(card) ?? undefined,
  };
}

/** Only the fields a charge needs — keeps this file free of the DB schema. */
export type ChargeableSubscription = {
  id: string;
  contactEmail: string;
  cloverCustomerId: string | null;
  cloverSourceId: string | null;
};

export type ChargeResult = {
  ok: boolean;
  stub?: boolean;
  chargeId?: string;
  reason?: string;
};

/**
 * Charge the vaulted card. `idempotencyKey` is required and must be stable for
 * a given (subscription, day) so a re-run of the sweep can never bill twice.
 */
export async function chargeSubscription(args: {
  sub: ChargeableSubscription;
  amountCents: number;
  idempotencyKey: string;
  description: string;
}): Promise<ChargeResult> {
  const { sub, amountCents, idempotencyKey, description } = args;

  if (amountCents <= 0) return { ok: false, reason: "nothing to charge" };
  if (!idempotencyKey.trim()) return { ok: false, reason: "missing idempotency key" };
  if (!sub.cloverSourceId) return { ok: false, reason: "no card on file" };

  if (stubMode()) {
    // Stub-only decline switch so the past-due / retry path can be exercised
    // without a real declining card. Unreachable in production, which never
    // runs in stub mode.
    if (process.env.STUB_FORCE_DECLINE === "1") {
      console.log(`[clover:stub] forced decline for ${sub.id}`);
      return { ok: false, reason: "card declined (stub)" };
    }
    console.log(
      `[clover:stub] charge ${amountCents}¢ for ${sub.id} — no network call (key ${idempotencyKey})`,
    );
    return { ok: true, stub: true, chargeId: `stubchg_${idempotencyKey}` };
  }

  const ip = originIp(null);
  let status: number;
  let json: { id?: string; status?: string; error?: { message?: string }; message?: string };
  try {
    const res = await fetch(`${apiBase()}/v1/charges`, {
      method: "POST",
      headers: authHeaders({
        "idempotency-key": idempotencyKey,
        ...(ip ? { "x-forwarded-for": ip } : {}),
      }),
      body: JSON.stringify({
        amount: amountCents,
        currency: "usd",
        source: sub.cloverSourceId,
        capture: true,
        ecomind: "ecom",
        description,
        receipt_email: sub.contactEmail,
        // The card was stored on a Clover customer at vault time, so every
        // renewal is a SUBSEQUENT, scheduled, merchant-initiated charge.
        stored_credentials: { sequence: "SUBSEQUENT", is_scheduled: true, initiator: "MERCHANT" },
      }),
    });
    status = res.status;
    json = await res.json().catch(() => ({}));
  } catch (e) {
    console.error("[clover] charge network error:", e);
    return { ok: false, reason: "could not reach the card processor" };
  }

  if (status < 200 || status >= 300 || !json.id) {
    return { ok: false, reason: json.error?.message ?? json.message ?? `clover-${status}` };
  }
  if (json.status && json.status !== "succeeded") {
    return { ok: false, chargeId: json.id, reason: `charge ${json.status}` };
  }
  return { ok: true, chargeId: json.id };
}

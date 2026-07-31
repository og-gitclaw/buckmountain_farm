"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Clover hosted card fields. The card number, expiry, and CVV are typed inside
 * Clover's own iframes and are never readable by this page or by our servers —
 * all we ever receive is a single-use token, which the server exchanges for a
 * saved card.
 *
 * Config comes from /api/payment-config at runtime, so rotating the key never
 * needs a rebuild.
 *
 * This is the ONLY place in the repo that declares `Window.Clover`. If /store
 * ever grows a real Clover checkout, import CloverInstance from here rather
 * than declaring the global a second time — two `declare global` blocks for
 * the same property is a TypeScript conflict.
 */

declare global {
  interface Window {
    Clover?: new (key: string, opts?: { merchantId?: string }) => CloverInstance;
  }
}
type CloverElement = { mount: (selector: string) => void };
export type CloverInstance = {
  elements: () => { create: (type: string) => CloverElement };
  createToken: () => Promise<{
    token?: string;
    card?: { brand?: string; last4?: string; exp_month?: string; exp_year?: string };
    errors?: Record<string, string>;
  }>;
};

type Config = {
  pakms: string;
  merchantId: string;
  env: string;
  configured: boolean;
  stub: boolean;
};

function sdkUrl(env: string): string {
  return env === "production"
    ? "https://checkout.clover.com/sdk.js"
    : "https://checkout.sandbox.dev.clover.com/sdk.js";
}

// The hosted-field mount points are namespaced `bmf-` per site: two Clover
// iframes sharing an element id would fight over the same mount.
const CELL =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 min-h-[46px] focus-within:border-amber-400/70";

export function CloverCardForm({ onDone }: { onDone?: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const clover = useRef<CloverInstance | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: Config) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the payment settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config?.configured || !config.pakms) return;
    let cancelled = false;

    function init() {
      if (cancelled || !window.Clover || clover.current) return;
      try {
        clover.current = new window.Clover(
          config!.pakms,
          config!.merchantId ? { merchantId: config!.merchantId } : undefined,
        );
        const elements = clover.current.elements();
        elements.create("CARD_NUMBER").mount("#bmf-card-number");
        elements.create("CARD_DATE").mount("#bmf-card-date");
        elements.create("CARD_CVV").mount("#bmf-card-cvv");
        elements.create("CARD_POSTAL_CODE").mount("#bmf-card-postal");
        setReady(true);
      } catch (e) {
        console.error(e);
        setError("The secure card fields could not be loaded. Please refresh and try again.");
      }
    }

    const url = sdkUrl(config.env);
    if (window.Clover) {
      init();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
      if (existing) {
        existing.addEventListener("load", init);
      } else {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.onload = init;
        s.onerror = () => setError("Could not reach the card processor.");
        document.body.appendChild(s);
      }
    }
    return () => {
      cancelled = true;
      clover.current = null;
    };
  }, [config]);

  const save = useCallback(
    async (payload: Record<string, string>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/billing/card", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "The card could not be saved.");
          return;
        }
        setSaved(true);
        router.refresh();
        onDone?.();
      } catch {
        setError("Network error — please try again.");
      } finally {
        setBusy(false);
      }
    },
    [router, onDone],
  );

  async function submit() {
    if (!clover.current) {
      setError("The card form isn't ready yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await clover.current.createToken();
      if (!res.token) {
        const first = res.errors ? Object.values(res.errors)[0] : null;
        setError(first || "Please check the card details and try again.");
        setBusy(false);
        return;
      }
      const exp =
        res.card?.exp_month && res.card?.exp_year
          ? `${String(res.card.exp_month).padStart(2, "0")}/${res.card.exp_year}`
          : "";
      await save({
        token: res.token,
        brand: res.card?.brand ?? "",
        last4: res.card?.last4 ?? "",
        exp,
      });
    } catch {
      setError("Please check the card details and try again.");
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5">
        <p className="font-semibold">Card saved.</p>
        <p className="mt-1 text-sm text-neutral-300">
          You&apos;ll see it on this page in a moment, along with the date of the next payment.
        </p>
      </div>
    );
  }

  if (!config) {
    return <p className="text-sm text-neutral-500">Loading the secure card form…</p>;
  }

  // Real credentials are loaded but something else is missing (usually the
  // publishable key). Do NOT offer the test card here — the server is live and
  // would send a made-up token to the real processor.
  if (!config.configured && !config.stub) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
        <p className="font-semibold">The card form isn&apos;t ready yet</p>
        <p className="mt-1 text-sm text-neutral-400">
          The payment account is connected but one setting is still missing, so the secure card
          fields can&apos;t load. We&apos;ve been notified — nothing is wrong with your account and
          nothing has been charged.
        </p>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>
    );
  }

  // No processor wired up yet: let staff walk the whole flow with a test card
  // so nothing is a surprise on the day the real account goes live.
  if (!config.configured) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5">
        <p className="font-semibold">Card processing isn&apos;t switched on yet</p>
        <p className="mt-1 text-sm text-neutral-400">
          The secure card form appears here once the payment account is connected. Until then you
          can save a test card to see exactly how billing will look. No real card is used and no
          money moves.
        </p>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ token: `stub_${Date.now()}` })}
          className="mt-4 rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-amber-400/70 hover:text-amber-200 transition disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save a test card"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="text-sm text-neutral-400">Card number</span>
        <div id="bmf-card-number" className={`mt-1.5 ${CELL}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-sm text-neutral-400">Expires</span>
          <div id="bmf-card-date" className={`mt-1.5 ${CELL}`} />
        </div>
        <div>
          <span className="text-sm text-neutral-400">Security code</span>
          <div id="bmf-card-cvv" className={`mt-1.5 ${CELL}`} />
        </div>
      </div>
      <div>
        <span className="text-sm text-neutral-400">Billing ZIP code</span>
        <div id="bmf-card-postal" className={`mt-1.5 ${CELL}`} />
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !ready}
          className="rounded-md bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save this card"}
        </button>
        {!ready && !error && (
          <span className="text-xs text-neutral-500">Loading secure fields…</span>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Your card details go straight to our payment processor. They never touch this website&apos;s
        servers and we never see the full number.
      </p>
    </div>
  );
}

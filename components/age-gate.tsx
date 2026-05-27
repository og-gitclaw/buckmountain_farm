"use client";

/**
 * California 21+ age gate.
 *
 * First-visit-only overlay. Stores acknowledgment in localStorage with a
 * 30-day TTL (industry standard for cannabis sites). Closes on "I am 21+"
 * click; hard-redirects to a "come back later" page if the visitor clicks
 * the under-21 button.
 *
 * Renders nothing on the server so it doesn't affect SSR / cause hydration
 * mismatch — the overlay flashes in only after mount, which is acceptable
 * for a regulatory checkbox (we already noindex anyway).
 *
 * Reduced motion: skips transitions, still respects the gate.
 */

import { useEffect, useState } from "react";

const KEY = "bm_age_verified_until";
const TTL_DAYS = 30;

export function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const expiry = Number(localStorage.getItem(KEY) ?? 0);
      if (expiry > Date.now()) return;
    } catch {
      // Private browsing / localStorage blocked — still show the gate.
    }
    setShow(true);
  }, []);

  function confirm() {
    try {
      localStorage.setItem(KEY, String(Date.now() + TTL_DAYS * 86400_000));
    } catch {}
    setShow(false);
  }

  function deny() {
    window.location.href =
      "https://www.responsibility.org/get-the-facts/research/statistics/youth-cannabis-use/";
  }

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md grid place-items-center p-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
      }}
    >
      <div className="max-w-md w-full rounded-2xl border border-white/15 bg-neutral-950 p-7 text-center space-y-5">
        <p className="uppercase tracking-[0.25em] text-xs text-white/50">
          California · Adult-use cannabis
        </p>
        <h2 id="age-gate-title" className="text-3xl font-bold">
          Are you 21 or older?
        </h2>
        <p className="text-sm text-white/70">
          Buck Mountain Cannabis content is intended for adults 21 years of
          age or older in California. By continuing you certify you meet
          that requirement.
        </p>
        <div className="flex gap-3 justify-center pt-1">
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-white text-black px-5 py-2.5 font-semibold"
          >
            Yes, I am 21+
          </button>
          <button
            type="button"
            onClick={deny}
            className="rounded-md border border-white/20 hover:border-white/40 px-5 py-2.5"
          >
            No
          </button>
        </div>
        <p className="text-xs text-white/40">
          Please consume responsibly. See our{" "}
          <a href="/terms" className="underline hover:text-white">terms</a> and{" "}
          <a href="/privacy" className="underline hover:text-white">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}

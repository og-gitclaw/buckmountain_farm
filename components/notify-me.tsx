"use client";

/**
 * Per-strain "notify me on the next batch" control.
 *
 * Posts to the existing /api/notifications/subscribe endpoint (the same
 * one the homepage feed form uses), so contact resolution stays
 * server-side: a signed-in visitor's optin is linked + a confirmation
 * email is queued; anonymous intent is still recorded. Kept fully
 * client-side so /strains/[slug] keeps prerendering statically — reading
 * the session here would force the page dynamic.
 */

import { useState } from "react";

type Channel = "push" | "email" | "sms";

export function NotifyMe({
  strainSlug,
  strainName,
}: {
  strainSlug: string;
  strainName: string;
}) {
  const [channel, setChannel] = useState<Channel>("push");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function submit() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ strain_slug: strainSlug, channel }),
      });
      if (res.status === 202) {
        setState("done");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Couldn’t add you — try again");
      setState("error");
    } catch {
      setError("Network error — try again");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100">
        You’re on the list — we’ll ping you when {strainName} drops.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="notify-channel" className="sr-only">
        Notification channel
      </label>
      <select
        id="notify-channel"
        value={channel}
        onChange={(e) => setChannel(e.target.value as Channel)}
        className="rounded-md bg-neutral-900 border border-white/20 px-3 py-2.5 text-sm"
      >
        <option value="push">Push</option>
        <option value="email">Email</option>
        <option value="sms">SMS</option>
      </select>
      <button
        type="button"
        onClick={submit}
        disabled={state === "loading"}
        className="rounded-md border border-white/20 hover:border-white/40 px-4 py-2.5 text-sm disabled:opacity-60"
      >
        {state === "loading" ? "Adding…" : "Notify me on next batch →"}
      </button>
      {state === "error" && (
        <span className="text-xs text-rose-300">{error}</span>
      )}
    </div>
  );
}

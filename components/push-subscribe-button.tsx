"use client";

/**
 * A one-tap button that:
 *   1. Registers /service-worker.js
 *   2. Fetches the VAPID public key from /api/push/subscribe (GET)
 *   3. Calls pushManager.subscribe() and POSTs the result back to
 *      /api/push/subscribe so the server stores the endpoint
 *
 * Drop into any page. Hides itself if Notification API isn't available
 * (mostly iOS Safari in non-PWA mode).
 */

import { useEffect, useState } from "react";

type State =
  | "idle"
  | "unsupported"
  | "subscribing"
  | "subscribed"
  | "denied"
  | "error";

function urlBase64ToBuffer(b64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function PushSubscribeButton() {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
    }
  }, []);

  async function subscribe() {
    setState("subscribing");
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js");
      await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/push/subscribe", { method: "GET" });
      if (!keyRes.ok) throw new Error("vapid-key-unavailable");
      const { vapid_public_key } = (await keyRes.json()) as {
        vapid_public_key: string;
      };
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapid_public_key),
      });
      const postRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!postRes.ok) throw new Error("server-save-failed");
      setState("subscribed");
    } catch {
      setState("error");
    }
  }

  if (state === "unsupported") return null;
  if (state === "subscribed") {
    return (
      <p className="text-sm text-emerald-300">
        Push notifications enabled. We&rsquo;ll ping you on drops.
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={state === "subscribing"}
      className="rounded-md border border-white/20 hover:border-white/40 px-4 py-2 text-sm disabled:opacity-50"
    >
      {state === "subscribing"
        ? "Enabling…"
        : state === "denied"
        ? "Notifications blocked — enable in browser settings"
        : state === "error"
        ? "Couldn't enable — try again"
        : "Enable push notifications"}
    </button>
  );
}

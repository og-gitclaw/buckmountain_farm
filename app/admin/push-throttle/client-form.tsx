"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  enabled: boolean;
  remaining: number;
  status_code: number;
  retry_after_seconds: number | null;
};

export function ClientThrottleForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [remaining, setRemaining] = useState(String(initial.remaining));
  const [statusCode, setStatusCode] = useState(String(initial.status_code));
  const [retryAfter, setRetryAfter] = useState(
    initial.retry_after_seconds == null ? "" : String(initial.retry_after_seconds),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(armed: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/push-throttle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: armed,
          remaining: Number(remaining),
          status_code: Number(statusCode),
          retry_after_seconds: retryAfter === "" ? null : Number(retryAfter),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(`Error: ${json.error ?? res.status}`);
      } else {
        setEnabled(armed);
        setMsg(armed ? "Armed." : "Disarmed.");
        router.refresh();
      }
    } catch (err) {
      setMsg(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-neutral-400">Fail next N pushes</span>
          <input
            type="number"
            min={0}
            max={10000}
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Injected status</span>
          <select
            value={statusCode}
            onChange={(e) => setStatusCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2"
          >
            {[429, 500, 502, 503, 504].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">
            Retry-After (s, optional)
          </span>
          <input
            type="number"
            min={0}
            max={600}
            value={retryAfter}
            onChange={(e) => setRetryAfter(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2"
            placeholder="—"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded-md bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          {enabled ? "Re-arm" : "Arm"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false)}
          className="rounded-md border border-neutral-600 hover:border-neutral-400 text-neutral-200 text-sm px-4 py-2 disabled:opacity-50"
        >
          Disarm
        </button>
        {msg && <span className="text-sm text-neutral-300">{msg}</span>}
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">
        The injection only fires when <code>enabled</code> is true and{" "}
        <code>remaining &gt; 0</code>. Each <code>sendToOne</code> atomically
        decrements the counter; when it hits 0 the row auto-disarms. Disarming
        manually halts injection immediately without affecting an in-flight
        send.
      </p>
    </div>
  );
}

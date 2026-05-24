/**
 * Nabis Platform V2 API thin client.
 *
 * Docs: https://developers.nabis.com/v2/docs/
 * Auth: Bearer NABIS_API_KEY
 * Base: NABIS_API_BASE_URL (default https://platform-api.nabis.pro/v2)
 *
 * Scope (P3):
 *   - listOrders({ since })
 *   - listInventories()
 *   - getOrder(id)
 *
 * Output is cached into Postgres `nabis_sync` (resource, external_id, payload)
 * so we don't hammer Nabis on every page load and so the agent dashboard
 * stays usable when Nabis is down for maintenance.
 *
 * Fail-open like the Alpine IQ client: if NABIS_API_KEY is unset, callers
 * receive a structured "skipped" result so stub pages render cleanly.
 */

type NabisResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }
  | { ok: false; skipped: true; reason: string };

const BASE = () =>
  process.env.NABIS_API_BASE_URL ?? "https://platform-api.nabis.pro/v2";
const KEY = () => process.env.NABIS_API_KEY ?? "";

function configured(): boolean {
  return Boolean(KEY());
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<NabisResult<T>> {
  if (!configured()) {
    return { ok: false, skipped: true, reason: "nabis-not-configured" };
  }
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY()}`,
      ...(init.headers ?? {}),
    },
    // Short cache: Nabis isn't a high-frequency API, but next/fetch's
    // default revalidate of 0 makes the agent dashboard feel snappy.
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: txt };
  }
  return { ok: true, data: (await res.json()) as T };
}

export type NabisOrder = {
  id: string;
  number: string;
  status: string;
  buyer: { id: string; name: string };
  total: number;
  created_at: string;
  delivered_at?: string | null;
};

export function listOrders(params: { since?: string; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.since) q.set("created_at[gte]", params.since);
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return call<{ data: NabisOrder[] }>(`/orders${qs ? `?${qs}` : ""}`);
}

export function listInventories() {
  return call<{ data: unknown[] }>("/inventories");
}

export function getOrder(id: string) {
  return call<NabisOrder>(`/orders/${encodeURIComponent(id)}`);
}

export const nabis = { listOrders, listInventories, getOrder, configured };

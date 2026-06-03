/**
 * /admin/push-throttle — super-admin-only Web Push fault-injection control.
 *
 * Arms a synthetic transient failure (429 / 5xx) for the next N sendToOne
 * calls so the retry path in lib/push.ts sendWithRetry can be exercised
 * end-to-end on a real preview / prod without poking FCM/APNs.
 *
 * Access:
 *   - Session required.
 *   - Email must be in the super-admin allowlist (lib/super-admin).
 *   - 404 (notFound) for everyone else so the page's existence is itself
 *     a non-signal to non-super-admins.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/super-admin";
import { ClientThrottleForm } from "./client-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type State = {
  enabled: boolean;
  remaining: number;
  status_code: number;
  retry_after_seconds: number | null;
  updated_by: string | null;
  updated_at: string;
};

async function loadState(): Promise<State | null> {
  if (!dbConfigured()) return null;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT enabled, remaining, status_code, retry_after_seconds,
             updated_by, updated_at
        FROM push_fault_injection
       WHERE id = 1
    `) as State[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export default async function PushThrottlePage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/google?return_to=/admin/push-throttle");
  if (!isSuperAdmin(session)) notFound();

  const state = await loadState();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <header className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Push fault injection</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Super-admin only. Arms a synthetic transient failure for the next
            N Web Push sends so the retry path can be exercised end-to-end.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-neutral-400 hover:text-white">
          ← Admin
        </Link>
      </header>

      {!state ? (
        <p className="max-w-3xl mx-auto text-neutral-500 italic">
          Database not configured — fault injection is a no-op in this
          environment. Apply{" "}
          <code>db/migrations/003_push_fault_injection.sql</code> to enable.
        </p>
      ) : (
        <>
          <section className="max-w-3xl mx-auto rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 mb-6 text-sm">
            <dl className="grid grid-cols-2 gap-y-2 gap-x-6">
              <dt className="text-neutral-500">Currently</dt>
              <dd>
                <span
                  className={
                    state.enabled
                      ? "text-rose-400 font-semibold"
                      : "text-emerald-400 font-semibold"
                  }
                >
                  {state.enabled ? "ARMED" : "Disarmed"}
                </span>
              </dd>
              <dt className="text-neutral-500">Pushes left to fail</dt>
              <dd>{state.remaining}</dd>
              <dt className="text-neutral-500">Injected status</dt>
              <dd>{state.status_code}</dd>
              <dt className="text-neutral-500">Injected Retry-After (s)</dt>
              <dd>{state.retry_after_seconds ?? "—"}</dd>
              <dt className="text-neutral-500">Last changed by</dt>
              <dd>{state.updated_by ?? "—"}</dd>
              <dt className="text-neutral-500">Last changed</dt>
              <dd>{new Date(state.updated_at).toLocaleString()}</dd>
            </dl>
          </section>

          <ClientThrottleForm initial={state} />
        </>
      )}
    </main>
  );
}

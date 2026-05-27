/**
 * /admin/agents — list + edit agent roles.
 *
 * Replaces the SQL-only role assignment process. Each row has an inline
 * form to update role/display_name/is_active; the top form creates a new
 * agent.
 *
 * Auth (P3): admin role required. Today this is behind Vercel Deployment
 * Protection only, like the other /admin/* surfaces.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AgentRow = {
  id: number;
  google_sub: string;
  email: string;
  display_name: string | null;
  role: "rep" | "manager" | "admin";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

const ROLES = ["rep", "manager", "admin"] as const;

async function loadAgents(): Promise<{ rows: AgentRow[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: [], stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, google_sub, email, display_name, role, is_active,
             created_at, last_login_at
        FROM agents
       ORDER BY created_at DESC
    `) as AgentRow[];
    return { rows, stub: false };
  } catch {
    return { rows: [], stub: true };
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.valueOf()) ? "—" : d.toISOString().slice(0, 10);
}

function truncMid(s: string, head = 6, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default async function AdminAgents({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const { rows, stub } = await loadAgents();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="pt-28 md:pt-32 pb-12 px-6 md:px-12 max-w-5xl mx-auto">
        <nav className="text-sm mb-4">
          <Link href="/admin" className="text-sky-400 hover:underline">
            ← Admin
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">Agents</h1>
        <p className="text-white/60 text-sm mt-1">
          Field reps, managers, and admins with portal access. Role gates
          what they can see in <code>/agent</code> and <code>/admin</code>.
        </p>

        {sp.ok && (
          <p className="mt-4 rounded-md border border-emerald-700 bg-emerald-950/40 text-emerald-300 text-sm px-3 py-2">
            {sp.ok === "created"
              ? "Agent created."
              : sp.ok === "updated"
              ? "Agent updated."
              : sp.ok}
          </p>
        )}
        {sp.error && (
          <p className="mt-4 rounded-md border border-red-700 bg-red-950/40 text-red-300 text-sm px-3 py-2">
            {sp.error}
          </p>
        )}

        {stub && (
          <p className="mt-6 rounded-md border border-amber-700 bg-amber-950/40 text-amber-300 text-sm px-3 py-2">
            Database not configured — showing empty list. Set{" "}
            <code>DATABASE_URL_UNPOOLED</code> in env to enable.
          </p>
        )}

        <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="font-semibold text-lg">Add agent</h2>
          <p className="text-xs text-white/50 mt-1">
            Use the Google <code>sub</code> claim (stable user id) — find it
            in <code>oglife_optins.oglife_user_id</code> after their first
            sign-in, or in the OAuth userinfo response.
          </p>
          <form
            method="POST"
            action="/api/admin/agents"
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="action" value="create" />
            <Field label="Google sub" name="google_sub" required>
              <input
                type="text"
                name="google_sub"
                required
                placeholder="103847182739182371982"
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Email" name="email" required>
              <input
                type="email"
                name="email"
                required
                placeholder="rep@buckmountain.farm"
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Display name" name="display_name">
              <input
                type="text"
                name="display_name"
                placeholder="Optional"
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Role" name="role" required>
              <select
                name="role"
                required
                defaultValue="rep"
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-white text-black px-5 py-2.5 font-semibold text-sm"
              >
                Add agent
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="font-semibold text-lg mb-3">
            Existing agents{" "}
            <span className="text-white/40 text-sm font-normal">
              ({rows.length})
            </span>
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-white/50">
              No agents yet. Add one above, or wait for a teammate to sign in
              and copy their Google sub out of <code>oglife_optins</code>.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/60 text-white/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Agent</th>
                    <th className="text-left px-3 py-2">Google sub</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-left px-3 py-2">Last login</th>
                    <th className="text-left px-3 py-2">Role / Active</th>
                    <th className="text-right px-3 py-2">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {rows.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="px-3 py-3">
                        <form
                          method="POST"
                          action="/api/admin/agents"
                          id={`agent-form-${a.id}`}
                        >
                          <input type="hidden" name="action" value="update" />
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            type="text"
                            name="display_name"
                            defaultValue={a.display_name ?? ""}
                            placeholder={a.email}
                            className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-1 text-sm"
                          />
                          <div className="text-xs text-white/50 mt-1">
                            {a.email}
                          </div>
                        </form>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-white/70">
                        <span title={a.google_sub}>{truncMid(a.google_sub)}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-white/60">
                        {fmtDate(a.created_at)}
                      </td>
                      <td className="px-3 py-3 text-xs text-white/60">
                        {fmtDate(a.last_login_at)}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          name="role"
                          defaultValue={a.role}
                          form={`agent-form-${a.id}`}
                          className="rounded-md bg-neutral-950 border border-neutral-700 px-2 py-1 text-sm"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <label className="ml-3 inline-flex items-center gap-1 text-xs text-white/70">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={a.is_active}
                            form={`agent-form-${a.id}`}
                          />
                          active
                        </label>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="submit"
                          form={`agent-form-${a.id}`}
                          className="rounded-md bg-white text-black px-3 py-1.5 font-semibold text-xs"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

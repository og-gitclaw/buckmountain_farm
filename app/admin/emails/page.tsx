/**
 * /admin/emails — outbound email log.
 *
 * Reads emails_outbound ordered by queued_at DESC. Lets you see what
 * went out, what failed (and why), and the SES message_id for bounce
 * correlation in CloudWatch.
 */

import Link from "next/link";
import { dbConfigured, getSql } from "@/lib/db";

// Admin pages are per-user, behind auth, and need fresh data. Forcing
// dynamic also decouples deploys from "schema migration must be applied
// first" — otherwise a build-time prerender against a missing table
// fails the whole deploy. (See PR #1 deploy failures pre-ce4538b.)
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: number;
  template: string;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  ses_message_id: string | null;
  queued_at: string;
  sent_at: string | null;
  related_kind: string | null;
  related_id: string | null;
};

async function loadRows(): Promise<{ rows: Row[]; stub: boolean }> {
  if (!dbConfigured()) return { rows: [], stub: true };
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, template, recipient, subject, status, error,
             ses_message_id, queued_at, sent_at, related_kind, related_id
        FROM emails_outbound
       ORDER BY queued_at DESC
       LIMIT 200
    `) as Row[];
    return { rows, stub: false };
  } catch {
    // Schema not migrated yet (or transient DB issue). Render empty
    // instead of throwing — never break the build/render on a DB hiccup.
    return { rows: [], stub: true };
  }
}

const STATUS_TINT: Record<string, string> = {
  sent: "text-emerald-300",
  queued: "text-sky-300",
  failed: "text-rose-300",
  bounced: "text-amber-300",
  complained: "text-amber-300",
};

export default async function AdminEmails() {
  const { rows, stub } = await loadRows();
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12 pt-28 md:pt-32">
      <nav className="max-w-6xl mx-auto mb-4 text-sm">
        <Link href="/admin" className="text-sky-400 hover:underline">← Admin</Link>
      </nav>
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Outbound emails</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Last 200 transactional sends · refreshes every 15s
          </p>
        </div>
        <form method="POST" action="/api/email/test" className="flex gap-2">
          <input
            type="email"
            name="to"
            placeholder="you@example.com"
            required
            className="rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-white text-black px-3 py-2 text-sm font-semibold"
          >
            Send test
          </button>
        </form>
      </header>
      <section className="max-w-6xl mx-auto">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <p className="text-neutral-500 italic">
              {stub
                ? "DB not configured here — no log to read."
                : "No emails sent yet. Trigger any flow (sign-in, scan a token, post a strain update) to populate."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-500 text-left">
                <tr className="border-b border-neutral-800">
                  <th className="py-3 px-4">Queued</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900 hover:bg-neutral-900/60">
                    <td className="py-2 px-4 text-neutral-400 whitespace-nowrap">
                      {new Date(r.queued_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs">{r.template}</td>
                    <td className="py-2 px-4 text-neutral-300 truncate max-w-[200px]" title={r.recipient}>
                      {r.recipient}
                    </td>
                    <td className="py-2 px-4 text-neutral-300 truncate max-w-[260px]" title={r.subject}>
                      {r.subject}
                    </td>
                    <td className="py-2 px-4">
                      <span className={STATUS_TINT[r.status] ?? ""}>{r.status}</span>
                    </td>
                    <td className="py-2 px-4 text-neutral-500 text-xs truncate max-w-[280px]" title={r.error ?? r.ses_message_id ?? ""}>
                      {r.error ?? r.ses_message_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

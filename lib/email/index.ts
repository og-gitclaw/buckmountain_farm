/**
 * sendTransactional — single entry point for every transactional email.
 *
 *   import { sendTransactional } from "@/lib/email";
 *
 *   await sendTransactional({
 *     template: "scan-points-credited",
 *     to: "user@example.com",
 *     vars: { points: 10, balance: 30, product_name: "Permanent OG" },
 *     related: { kind: "scan", id: "stub-scan-id" },
 *   });
 *
 * What it does, in order:
 *   1. Render via TEMPLATES[template](vars)
 *   2. Log to emails_outbound (status='queued')
 *   3. Hand to sesSend()
 *   4. Update emails_outbound (status='sent' + ses_message_id, or 'failed' + error)
 *
 * Fail-open: missing SES env → log row gets status='failed' reason='ses-not-configured'.
 *            missing DB → still attempts SES send, returns the result.
 *
 * Convenience: `sendToAdmin()` resolves the recipient list from MAIL_ADMIN_BCC
 * + MAIL_ADMIN_RECIPIENTS (comma-separated) so admin-side templates don't
 * have to know who's reading.
 */

import { dbConfigured, getSql } from "@/lib/db";
import { sesSend, sesConfigured } from "./ses";
import { TEMPLATES, type TemplateName, type TemplatePayload } from "./templates";

export { sesConfigured };

type Related = { kind?: string; id?: string };

export type SendResult =
  | { ok: true; message_id: string; outbound_id: number | null }
  | { ok: false; reason: string; outbound_id: number | null };

/** The core API. Use this everywhere. */
export async function sendTransactional<K extends TemplateName>(opts: {
  template: K;
  to: string;
  vars: TemplatePayload[K];
  replyTo?: string;
  bccAdmin?: boolean;
  related?: Related;
  /** When the recipient is a known oglife_optins.id, link the log row. */
  optin_id?: number | null;
}): Promise<SendResult> {
  const rendered = (TEMPLATES[opts.template] as (v: TemplatePayload[K]) => {
    subject: string;
    html: string;
    text: string;
  })(opts.vars);

  let outbound_id: number | null = null;
  if (dbConfigured()) {
    try {
      const sql = getSql();
      const rows = (await sql`
        INSERT INTO emails_outbound
          (template, recipient, recipient_optin_id, subject, vars, status, related_kind, related_id)
        VALUES
          (${opts.template}, ${opts.to}, ${opts.optin_id ?? null},
           ${rendered.subject}, ${JSON.stringify(opts.vars)}::jsonb, 'queued',
           ${opts.related?.kind ?? null}, ${opts.related?.id ?? null})
        RETURNING id
      `) as { id: number }[];
      outbound_id = rows[0]?.id ?? null;
    } catch {
      // Non-fatal — we still try the send.
    }
  }

  const res = await sesSend({
    to: opts.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: opts.replyTo,
    bccAdmin: opts.bccAdmin,
    tags: { template: opts.template },
  });

  // Update the log row with outcome.
  if (outbound_id != null && dbConfigured()) {
    try {
      const sql = getSql();
      if (res.ok) {
        await sql`
          UPDATE emails_outbound
             SET status = 'sent',
                 ses_message_id = ${res.message_id},
                 sent_at = now()
           WHERE id = ${outbound_id}
        `;
      } else if ("skipped" in res && res.skipped) {
        await sql`
          UPDATE emails_outbound SET status = 'failed', error = ${res.reason} WHERE id = ${outbound_id}
        `;
      } else {
        await sql`
          UPDATE emails_outbound SET status = 'failed', error = ${(res as { error: string }).error}
           WHERE id = ${outbound_id}
        `;
      }
    } catch {
      // Non-fatal — we still return the actual SES result.
    }
  }

  if (res.ok) {
    return { ok: true, message_id: res.message_id, outbound_id };
  }
  const reason =
    "skipped" in res && res.skipped
      ? res.reason
      : (res as { error: string }).error;
  return { ok: false, reason, outbound_id };
}

/** Send the SAME message to every admin recipient. Skips silently if no admins configured. */
export async function sendToAdmin<K extends TemplateName>(opts: {
  template: K;
  vars: TemplatePayload[K];
  related?: Related;
}): Promise<SendResult[]> {
  const list = [
    process.env.MAIL_ADMIN_BCC,
    process.env.MAIL_ADMIN_RECIPIENTS,
  ]
    .filter(Boolean)
    .flatMap((s) => (s as string).split(","))
    .map((e) => e.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return [{ ok: false, reason: "no-admin-recipients", outbound_id: null }];
  }
  return Promise.all(
    list.map((to) =>
      sendTransactional({
        template: opts.template,
        to,
        vars: opts.vars,
        related: opts.related,
      }),
    ),
  );
}

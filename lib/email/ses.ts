/**
 * AWS SES v2 driver.
 *
 * Transactional email only — per Brendon directive, AWS SES is reserved
 * for receipts, system messages, identity events, order lifecycle. All
 * marketing/drip lives in Alpine IQ.
 *
 * Env (probed in priority order so we work across IAM and SMTP setups):
 *   - AWS_SES_REGION || AWS_REGION  (default us-east-1)
 *   - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY  (preferred — IAM user)
 *   - MAIL_FROM_TRANSACTIONAL  (default no-reply@buckmountain.farm)
 *   - MAIL_REPLY_TO            (default support@buckmountain.farm)
 *   - MAIL_ADMIN_BCC           (admin alerts go here — optional)
 *
 * Fail-open: if env isn't set, `send()` returns
 *   { ok: false, skipped: true, reason: "ses-not-configured" }
 * so callers can render preview deploys cleanly.
 */

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let cached: SESv2Client | null = null;

function configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    (process.env.AWS_SES_REGION || process.env.AWS_REGION)
  );
}

export function sesConfigured(): boolean {
  return configured();
}

function client(): SESv2Client {
  if (cached) return cached;
  cached = new SESv2Client({
    region:
      process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

export function fromAddress(): string {
  return (
    process.env.MAIL_FROM_TRANSACTIONAL ??
    "Buck Mountain Cannabis <no-reply@buckmountain.farm>"
  );
}

export function replyToAddress(): string {
  return process.env.MAIL_REPLY_TO ?? "support@buckmountain.farm";
}

export function adminBccAddress(): string | null {
  return process.env.MAIL_ADMIN_BCC ?? null;
}

export type SesSendResult =
  | { ok: true; message_id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; status: number | null; error: string };

export async function sesSend(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  bccAdmin?: boolean;
  configurationSetName?: string;
  tags?: Record<string, string>;
}): Promise<SesSendResult> {
  if (!configured()) {
    return { ok: false, skipped: true, reason: "ses-not-configured" };
  }
  const c = client();
  const toAddrs = Array.isArray(opts.to) ? opts.to : [opts.to];
  const bcc = opts.bccAdmin && adminBccAddress() ? [adminBccAddress()!] : undefined;
  try {
    const cmd = new SendEmailCommand({
      FromEmailAddress: fromAddress(),
      Destination: { ToAddresses: toAddrs, BccAddresses: bcc },
      ReplyToAddresses: [opts.replyTo ?? replyToAddress()],
      Content: {
        Simple: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: opts.html, Charset: "UTF-8" },
            Text: { Data: opts.text, Charset: "UTF-8" },
          },
        },
      },
      ConfigurationSetName:
        opts.configurationSetName ?? process.env.SES_CONFIGURATION_SET,
      EmailTags: opts.tags
        ? Object.entries(opts.tags).map(([Name, Value]) => ({ Name, Value }))
        : undefined,
    });
    const res = await c.send(cmd);
    return { ok: true, message_id: res.MessageId ?? "" };
  } catch (err) {
    const e = err as { $metadata?: { httpStatusCode?: number }; message?: string };
    return {
      ok: false,
      status: e.$metadata?.httpStatusCode ?? null,
      error: e.message ?? "ses-send-failed",
    };
  }
}

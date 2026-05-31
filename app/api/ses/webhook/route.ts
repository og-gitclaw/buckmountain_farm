/**
 * POST /api/ses/webhook — SES bounce/complaint handler (via SNS).
 *
 * Wire this URL as the HTTPS subscription on the SNS topics SES publishes
 * Bounce + Complaint notifications to (Configuration Set event publishing
 * or per-identity notifications).
 *
 * Flow:
 *   1. Verify the SNS message signature (RSA-SHA1 v1 / RSA-SHA256 v2) using
 *      the publisher cert, whose URL host must be sns.<region>.amazonaws.com.
 *      Unsigned / bad-signature / non-AWS-cert requests are rejected 403.
 *   2. SubscriptionConfirmation → confirm by GETting the SubscribeURL
 *      (host-validated, so this can't be turned into an SSRF gadget).
 *   3. Notification → parse the SES event and mark the matching
 *      emails_outbound row 'bounced' (permanent bounces only) or
 *      'complained', correlated by ses_message_id, and log to audit_log.
 *
 * SES's own account-level suppression list stops re-sending to bounced /
 * complained addresses; this endpoint is the app-side record + audit trail.
 *
 * Fail-open: no DB configured → signature still verified, event ignored.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { dbConfigured, getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnsMessage = {
  Type?: string;
  MessageId?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  TopicArn?: string;
  Token?: string;
  SubscribeURL?: string;
  Signature?: string;
  SignatureVersion?: string;
  SigningCertURL?: string;
};

type SesRecipient = { emailAddress?: string };
type SesEvent = {
  notificationType?: string;
  eventType?: string;
  mail?: { messageId?: string };
  bounce?: { bounceType?: string; bouncedRecipients?: SesRecipient[] };
  complaint?: { complainedRecipients?: SesRecipient[] };
};

// Fields included in the SNS string-to-sign, in the exact order SNS uses.
const SIGN_FIELDS: Record<string, string[]> = {
  Notification: ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"],
  SubscriptionConfirmation: [
    "Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type",
  ],
  UnsubscribeConfirmation: [
    "Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type",
  ],
};

function isAwsSnsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(u.hostname)
    );
  } catch {
    return false;
  }
}

function buildStringToSign(msg: SnsMessage): string {
  const fields = SIGN_FIELDS[msg.Type ?? ""];
  if (!fields) return "";
  const m = msg as Record<string, string | undefined>;
  let out = "";
  for (const f of fields) {
    const v = m[f];
    if (v === undefined || v === null) continue; // Subject is optional
    out += `${f}\n${v}\n`;
  }
  return out;
}

const certCache = new Map<string, string>();

async function fetchCert(url: string): Promise<string | null> {
  if (!isAwsSnsUrl(url)) return null;
  const cached = certCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const pem = await res.text();
    certCache.set(url, pem);
    return pem;
  } catch {
    return null;
  }
}

async function verifySignature(msg: SnsMessage): Promise<boolean> {
  if (!msg.Signature || !msg.SigningCertURL) return false;
  const pem = await fetchCert(msg.SigningCertURL);
  if (!pem) return false;
  const algo = msg.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  try {
    const verifier = crypto.createVerify(algo);
    verifier.update(buildStringToSign(msg), "utf8");
    verifier.end();
    return verifier.verify(pem, msg.Signature, "base64");
  } catch {
    return false;
  }
}

async function markStatus(
  status: "bounced" | "complained",
  messageId: string | null,
  recipients: string[],
): Promise<void> {
  if (!dbConfigured()) return;
  const sql = getSql();
  try {
    if (messageId) {
      await sql`
        UPDATE emails_outbound
           SET status = ${status}
         WHERE ses_message_id = ${messageId}
      `;
    } else if (recipients.length > 0) {
      await sql`
        UPDATE emails_outbound
           SET status = ${status}
         WHERE recipient = ANY(${recipients}) AND status = 'sent'
      `;
    }
    await sql`
      INSERT INTO audit_log (actor, action, target_kind, target_id, payload)
      VALUES (
        'ses-webhook',
        ${`email.${status}`},
        'email',
        ${messageId ?? recipients[0] ?? ""},
        ${JSON.stringify({ messageId, recipients })}::jsonb
      )
    `;
  } catch {
    /* non-fatal — never 500 a webhook over a logging miss */
  }
}

async function handleSesEvent(event: SesEvent): Promise<void> {
  const messageId = event.mail?.messageId ?? null;
  const type = event.notificationType ?? event.eventType;

  if (type === "Bounce" && event.bounce?.bounceType === "Permanent") {
    const recipients = (event.bounce.bouncedRecipients ?? [])
      .map((r) => r.emailAddress)
      .filter((e): e is string => Boolean(e));
    await markStatus("bounced", messageId, recipients);
  } else if (type === "Complaint") {
    const recipients = (event.complaint?.complainedRecipients ?? [])
      .map((r) => r.emailAddress)
      .filter((e): e is string => Boolean(e));
    await markStatus("complained", messageId, recipients);
  }
  // Delivery / transient bounces / other types: nothing to record.
}

export async function POST(req: Request) {
  const raw = await req.text();
  let msg: SnsMessage;
  try {
    msg = JSON.parse(raw) as SnsMessage;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!msg.Type) {
    return NextResponse.json({ error: "not-an-sns-message" }, { status: 400 });
  }

  if (!(await verifySignature(msg))) {
    return NextResponse.json({ error: "bad-signature" }, { status: 403 });
  }

  if (msg.Type === "SubscriptionConfirmation") {
    if (msg.SubscribeURL && isAwsSnsUrl(msg.SubscribeURL)) {
      await fetch(msg.SubscribeURL).catch(() => {});
    }
    return NextResponse.json({ ok: true, confirmed: true });
  }

  if (msg.Type === "Notification") {
    if (msg.Message) {
      try {
        await handleSesEvent(JSON.parse(msg.Message) as SesEvent);
      } catch {
        return NextResponse.json({ ok: true, ignored: "unparsable-message" });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: msg.Type });
}

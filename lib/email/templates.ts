/**
 * Transactional email templates — one render function per touchpoint.
 *
 * Adding a new template:
 *   1. Add the key to TemplateName.
 *   2. Add the payload type to TemplatePayload.
 *   3. Add the render function to TEMPLATES.
 *
 * Each render returns { subject, html, text }. Callers go through
 * lib/email/index.ts → sendTransactional(), which handles SES + audit log.
 *
 * Convention: all templates accept an optional `recipient_name` so we can
 * personalize the greeting; absent that, the greeting is "Hey there,".
 *
 * Marketing-tone copy belongs in Alpine IQ, not here. These are functional:
 * the user did a thing, we tell them what happened.
 */

import { divider, escapeHtml, h1, p, renderHtml, renderText } from "./render";

export type TemplateName =
  | "welcome"
  | "consent-confirmed"
  | "scan-points-credited"
  | "counterfeit-alert"          // admin-side
  | "subscription-confirmed"
  | "qr-sheet-allocated"         // to Photoshop team
  | "qr-sheet-ingested"          // admin-side
  | "visit-report-filed"
  | "strain-drop"                // broadcast
  | "order-placed"
  | "order-shipped"
  | "order-delivered"
  | "order-canceled"
  | "review-request"
  | "prize-winner"
  | "health-alert";              // admin-side

export type TemplatePayload = {
  welcome: { recipient_name?: string };
  "consent-confirmed": {
    recipient_name?: string;
    consents: Record<string, boolean | string>;
  };
  "scan-points-credited": {
    recipient_name?: string;
    points: number;
    balance: number;
    product_name?: string | null;
    product_url?: string | null;
  };
  "counterfeit-alert": {
    token: string;
    ip_hash: string;
    geo_city?: string | null;
    geo_country?: string | null;
    user_agent?: string;
  };
  "subscription-confirmed": {
    recipient_name?: string;
    strain_slug?: string | null;
    product_slug?: string | null;
    category?: string | null;
    channel: "push" | "sms" | "email";
  };
  "qr-sheet-allocated": {
    sheet_code: string;
    count: number;
    tokens: string[];
    notes?: string | null;
    pickup_path: string;
  };
  "qr-sheet-ingested": {
    sheet_code: string | null;
    tokens_inserted: number;
    tokens_skipped: number;
    asset_id?: string | null;
  };
  "visit-report-filed": {
    agent_email: string;
    dispensary_id: string;
    dispensary_name?: string | null;
    contact_name?: string | null;
    summary?: string | null;
    action_items: string[];
  };
  "strain-drop": {
    recipient_name?: string;
    strain_name: string;
    strain_slug: string;
    headline: string;
    body: string;
  };
  "order-placed": {
    recipient_name?: string;
    order_number: string;
    order_total?: string | null;
    items?: { name: string; qty: number; price?: string }[];
    status_url?: string;
  };
  "order-shipped": {
    recipient_name?: string;
    order_number: string;
    carrier?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    eta?: string | null;
  };
  "order-delivered": {
    recipient_name?: string;
    order_number: string;
    review_url: string;
  };
  "order-canceled": {
    recipient_name?: string;
    order_number: string;
    reason?: string | null;
  };
  "review-request": {
    recipient_name?: string;
    order_number: string;
    review_url: string;
  };
  "prize-winner": {
    recipient_name?: string;
    prize: string;
    month: string;
    fulfillment_email: string;
  };
  "health-alert": {
    integration: string;
    detail: string;
    timestamp: string;
  };
};

type Rendered = { subject: string; html: string; text: string };

function greeting(name?: string): string {
  return name ? `Hey ${escapeHtml(name)},` : "Hey there,";
}

/** Centralized list of supported channels for SMS-style copy footers. */
const STOP_FOOTER =
  "Reply STOP to opt out, HELP for help. Msg & data rates may apply.";

export const TEMPLATES: {
  [K in TemplateName]: (vars: TemplatePayload[K]) => Rendered;
} = {
  welcome: (v) => {
    const subject = "Welcome to Buck Mountain Cannabis";
    return {
      subject,
      html: renderHtml({
        preheader: "Your account is live. Scan a sticker to start earning.",
        bodyBlocks: [
          h1("Welcome to Buck Mountain."),
          p(greeting(v.recipient_name)),
          p(
            "You're signed in. From here you can scan the QR sticker under any Buck Mountain jar lid to claim authenticity, earn loyalty points, and enter the monthly prize drop.",
          ),
        ],
        cta: { label: "Open your account", url: "https://buckmountain.farm/loyalty/account" },
      }),
      text: renderText({
        body: `${greeting(v.recipient_name)}

You're signed in to Buck Mountain Cannabis. Scan the QR sticker under any Buck Mountain jar lid to claim authenticity, earn loyalty points, and enter the monthly prize drop.`,
        cta: { label: "Open your account", url: "https://buckmountain.farm/loyalty/account" },
      }),
    };
  },

  "consent-confirmed": (v) => {
    const opts = Object.entries(v.consents)
      .filter(([, val]) => val === true)
      .map(([k]) => `<li style="margin:0 0 4px;">${escapeHtml(k.replace(/_/g, " "))}</li>`)
      .join("");
    return {
      subject: "Your communication preferences",
      html: renderHtml({
        preheader: "Saved. You can change any of these from your account.",
        bodyBlocks: [
          h1("Preferences saved"),
          p(greeting(v.recipient_name)),
          p("You opted in to:"),
          `<ul style="margin:0 0 16px;padding-left:20px;color:#1a1a1a;font-size:15px;line-height:1.6;">${opts || "<li>(no marketing opt-ins)</li>"}</ul>`,
          p(
            'Change anything anytime from <a href="https://buckmountain.farm/loyalty/account" style="color:#5b3a8a;">your account</a>.',
          ),
        ],
      }),
      text: renderText({
        body: `${greeting(v.recipient_name)}

Preferences saved. You opted in to:
${
  Object.entries(v.consents)
    .filter(([, val]) => val === true)
    .map(([k]) => `  - ${k.replace(/_/g, " ")}`)
    .join("\n") || "  (no marketing opt-ins)"
}

Change anything anytime: https://buckmountain.farm/loyalty/account`,
      }),
    };
  },

  "scan-points-credited": (v) => ({
    subject: `+${v.points} points · balance ${v.balance}`,
    html: renderHtml({
      preheader: `${v.product_name ? "Real jar of " + v.product_name + ". " : ""}Points credited.`,
      bodyBlocks: [
        h1(`+${v.points} points`),
        p(greeting(v.recipient_name)),
        p(
          v.product_name
            ? `That sticker came off a real jar of ${escapeHtml(v.product_name)}. We just credited your account.`
            : "That sticker is the real deal. We just credited your account.",
        ),
        p(`Current balance: <strong>${v.balance}</strong> points. Every scan = one entry into the monthly prize drop.`),
      ],
      cta: v.product_url
        ? { label: "Read about this strain", url: v.product_url }
        : { label: "Open your account", url: "https://buckmountain.farm/loyalty/account" },
    }),
    text: renderText({
      body: `${greeting(v.recipient_name)}

+${v.points} points credited. Current balance: ${v.balance}.
${v.product_name ? `Strain: ${v.product_name}` : ""}`,
      cta: v.product_url
        ? { label: "Read about this strain", url: v.product_url }
        : { label: "Open your account", url: "https://buckmountain.farm/loyalty/account" },
    }),
  }),

  "counterfeit-alert": (v) => ({
    subject: `[admin] Counterfeit-pattern scan: ${v.token}`,
    html: renderHtml({
      preheader: "An unregistered token was scanned.",
      bodyBlocks: [
        h1("Counterfeit-pattern scan"),
        p(
          `Token <code>${escapeHtml(v.token)}</code> was scanned but isn't in our <code>qr_tokens</code> table.`,
        ),
        p(
          `Geo: ${escapeHtml(v.geo_city ?? "?")}, ${escapeHtml(v.geo_country ?? "?")}<br/>IP hash: <code>${escapeHtml(v.ip_hash)}</code>${v.user_agent ? `<br/>UA: ${escapeHtml(v.user_agent)}` : ""}`,
        ),
        p("Cluster of these around the same geo = supply-chain investigation."),
      ],
    }),
    text: renderText({
      body: `Counterfeit-pattern scan
Token: ${v.token}
Geo: ${v.geo_city ?? "?"}, ${v.geo_country ?? "?"}
IP hash: ${v.ip_hash}${v.user_agent ? `\nUA: ${v.user_agent}` : ""}`,
    }),
  }),

  "subscription-confirmed": (v) => {
    const what =
      v.strain_slug ??
      v.product_slug ??
      (v.category ? `the ${v.category} line` : "new drops");
    return {
      subject: `Subscribed: ${what}`,
      html: renderHtml({
        preheader: `We'll ping you via ${v.channel} when ${what} drops.`,
        bodyBlocks: [
          h1(`Subscribed to ${escapeHtml(what)}`),
          p(greeting(v.recipient_name)),
          p(
            `You'll get a ${escapeHtml(v.channel)} the moment the next batch packages. Honest cadence — no daily noise.`,
          ),
          p(
            'Manage subscriptions: <a href="https://buckmountain.farm/loyalty/account" style="color:#5b3a8a;">your account</a>.',
          ),
        ],
      }),
      text: renderText({
        body: `${greeting(v.recipient_name)}

Subscribed to ${what}. We'll ping you via ${v.channel} when the next batch packages.

Manage subscriptions: https://buckmountain.farm/loyalty/account`,
      }),
    };
  },

  "qr-sheet-allocated": (v) => {
    const sample = v.tokens.slice(0, 5).map((t) => `<li><code>${escapeHtml(t)}</code></li>`).join("");
    return {
      subject: `QR sheet ${v.sheet_code}: ${v.count} tokens allocated`,
      html: renderHtml({
        preheader: "Token list attached to ready-to-render sticker artwork.",
        bodyBlocks: [
          h1(`Sheet ${escapeHtml(v.sheet_code)}`),
          p(`<strong>${v.count}</strong> tokens pre-allocated for this print run.`),
          v.notes ? p(`Notes: ${escapeHtml(v.notes)}`) : "",
          p("First 5 tokens (full list at the path below):"),
          `<ul style="margin:0 0 16px;padding-left:20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#1a1a1a;">${sample}</ul>`,
          p(
            `Pickup path: <code>${escapeHtml(v.pickup_path)}</code><br/>Drop the rendered <code>${escapeHtml(v.sheet_code)}_sheet.png</code> + <code>${escapeHtml(v.sheet_code)}_tokens.txt</code> back into the same folder; the openclaw watcher will ingest on the next poll.`,
          ),
        ],
      }),
      text: renderText({
        body: `Sheet ${v.sheet_code}: ${v.count} tokens allocated.
${v.notes ? `Notes: ${v.notes}\n` : ""}
First 5:
${v.tokens.slice(0, 5).map((t) => `  ${t}`).join("\n")}

Pickup path: ${v.pickup_path}
Drop the rendered ${v.sheet_code}_sheet.png + ${v.sheet_code}_tokens.txt into the same folder.`,
      }),
    };
  },

  "qr-sheet-ingested": (v) => ({
    subject: `[admin] QR sheet ingested: ${v.sheet_code ?? "(unnamed)"}`,
    html: renderHtml({
      preheader: `${v.tokens_inserted} tokens added`,
      bodyBlocks: [
        h1("Sheet ingested"),
        p(
          `Sheet: <strong>${escapeHtml(v.sheet_code ?? "(none)")}</strong><br/>Tokens inserted: ${v.tokens_inserted}<br/>Tokens skipped (duplicates): ${v.tokens_skipped}${v.asset_id ? `<br/>Asset: <code>${escapeHtml(v.asset_id)}</code>` : ""}`,
        ),
      ],
    }),
    text: renderText({
      body: `Sheet ingested.
Sheet: ${v.sheet_code ?? "(none)"}
Inserted: ${v.tokens_inserted}
Skipped: ${v.tokens_skipped}${v.asset_id ? `\nAsset: ${v.asset_id}` : ""}`,
    }),
  }),

  "visit-report-filed": (v) => {
    const items = v.action_items.length
      ? v.action_items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")
      : "<li>(none)</li>";
    return {
      subject: `Visit logged: ${v.dispensary_name ?? v.dispensary_id}`,
      html: renderHtml({
        preheader: `Action items: ${v.action_items.length}`,
        bodyBlocks: [
          h1(`Visit · ${escapeHtml(v.dispensary_name ?? v.dispensary_id)}`),
          p(`Filed by: ${escapeHtml(v.agent_email)}`),
          v.contact_name ? p(`Talked to: ${escapeHtml(v.contact_name)}`) : "",
          v.summary ? p(escapeHtml(v.summary)) : "",
          divider(),
          p("Action items:"),
          `<ul style="margin:0 0 16px;padding-left:20px;color:#1a1a1a;font-size:15px;line-height:1.6;">${items}</ul>`,
        ],
        cta: {
          label: "Open dispensary",
          url: `https://buckmountain.farm/agent/dispensaries/${encodeURIComponent(v.dispensary_id)}`,
        },
      }),
      text: renderText({
        body: `Visit logged.
Dispensary: ${v.dispensary_name ?? v.dispensary_id}
Filed by: ${v.agent_email}
${v.contact_name ? `Talked to: ${v.contact_name}\n` : ""}${v.summary ? `\nSummary: ${v.summary}\n` : ""}
Action items:
${v.action_items.length ? v.action_items.map((i) => `  - ${i}`).join("\n") : "  (none)"}`,
        cta: {
          label: "Open dispensary",
          url: `https://buckmountain.farm/agent/dispensaries/${encodeURIComponent(v.dispensary_id)}`,
        },
      }),
    };
  },

  "strain-drop": (v) => ({
    subject: v.headline,
    html: renderHtml({
      preheader: `${v.strain_name} · new drop`,
      bodyBlocks: [
        h1(v.headline),
        p(greeting(v.recipient_name)),
        p(escapeHtml(v.body)),
      ],
      cta: { label: `See ${v.strain_name}`, url: `https://buckmountain.farm/strains/${v.strain_slug}` },
      footerLines: [
        "You're subscribed to drop alerts for this strain.",
        '<a href="https://buckmountain.farm/loyalty/account" style="color:#5b3a8a;">Manage subscriptions</a>',
      ],
    }),
    text: renderText({
      body: `${v.headline}

${v.body}`,
      cta: { label: `See ${v.strain_name}`, url: `https://buckmountain.farm/strains/${v.strain_slug}` },
    }),
  }),

  "order-placed": (v) => {
    const itemsHtml = (v.items ?? [])
      .map(
        (it) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e0d7;">${escapeHtml(it.name)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e0d7;text-align:right;color:#555;">×${it.qty}${it.price ? ` &nbsp; ${escapeHtml(it.price)}` : ""}</td></tr>`,
      )
      .join("");
    return {
      subject: `Order received · #${v.order_number}`,
      html: renderHtml({
        preheader: `Order #${v.order_number} accepted${v.order_total ? ` · ${v.order_total}` : ""}`,
        bodyBlocks: [
          h1(`Order #${escapeHtml(v.order_number)} received`),
          p(greeting(v.recipient_name)),
          p("We've got your order. You'll get another email the moment it ships."),
          itemsHtml
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 16px;font-size:15px;">${itemsHtml}</table>`
            : "",
          v.order_total ? p(`<strong>Total: ${escapeHtml(v.order_total)}</strong>`) : "",
        ],
        cta: v.status_url ? { label: "Track status", url: v.status_url } : undefined,
      }),
      text: renderText({
        body: `${greeting(v.recipient_name)}

Order #${v.order_number} received.
${
  (v.items ?? [])
    .map((it) => `  - ${it.name} ×${it.qty}${it.price ? ` ${it.price}` : ""}`)
    .join("\n") || ""
}
${v.order_total ? `\nTotal: ${v.order_total}` : ""}`,
        cta: v.status_url ? { label: "Track status", url: v.status_url } : undefined,
      }),
    };
  },

  "order-shipped": (v) => ({
    subject: `Order #${v.order_number} shipped`,
    html: renderHtml({
      preheader: `${v.carrier ? v.carrier + " · " : ""}${v.tracking_number ?? "tracking inside"}`,
      bodyBlocks: [
        h1(`Order #${escapeHtml(v.order_number)} shipped`),
        p(greeting(v.recipient_name)),
        v.carrier ? p(`Carrier: <strong>${escapeHtml(v.carrier)}</strong>`) : "",
        v.tracking_number
          ? p(
              `Tracking: <code>${escapeHtml(v.tracking_number)}</code>${v.eta ? `<br/>ETA: ${escapeHtml(v.eta)}` : ""}`,
            )
          : "",
      ],
      cta: v.tracking_url ? { label: "Track package", url: v.tracking_url } : undefined,
    }),
    text: renderText({
      body: `${greeting(v.recipient_name)}

Order #${v.order_number} shipped.
${v.carrier ? `Carrier: ${v.carrier}\n` : ""}${v.tracking_number ? `Tracking: ${v.tracking_number}\n` : ""}${v.eta ? `ETA: ${v.eta}\n` : ""}`,
      cta: v.tracking_url ? { label: "Track package", url: v.tracking_url } : undefined,
    }),
  }),

  "order-delivered": (v) => ({
    subject: `Order #${v.order_number} delivered`,
    html: renderHtml({
      preheader: "Two minutes to leave a review?",
      bodyBlocks: [
        h1("Delivered."),
        p(greeting(v.recipient_name)),
        p("Hope it's everything you ordered."),
        p("If you have two minutes, leave a review — it genuinely helps."),
      ],
      cta: { label: "Leave a review", url: v.review_url },
    }),
    text: renderText({
      body: `${greeting(v.recipient_name)}

Order #${v.order_number} delivered. Hope it's everything you ordered.

If you've got two minutes, drop us a review.`,
      cta: { label: "Leave a review", url: v.review_url },
    }),
  }),

  "order-canceled": (v) => ({
    subject: `Order #${v.order_number} canceled`,
    html: renderHtml({
      bodyBlocks: [
        h1(`Order #${escapeHtml(v.order_number)} canceled`),
        p(greeting(v.recipient_name)),
        p(v.reason ? `Reason: ${escapeHtml(v.reason)}` : "Reach out if you have questions."),
      ],
    }),
    text: renderText({
      body: `${greeting(v.recipient_name)}

Order #${v.order_number} canceled.${v.reason ? `\nReason: ${v.reason}` : ""}`,
    }),
  }),

  "review-request": (v) => ({
    subject: "How was it?",
    html: renderHtml({
      preheader: "Two minutes — drop us a review.",
      bodyBlocks: [
        h1("Two minutes for a review?"),
        p(greeting(v.recipient_name)),
        p(`Order #${escapeHtml(v.order_number)} should be in your hands by now. If you've got two minutes, let us know how it went — good or bad, all of it helps.`),
      ],
      cta: { label: "Leave a review", url: v.review_url },
    }),
    text: renderText({
      body: `${greeting(v.recipient_name)}

Order #${v.order_number} should be in your hands by now. If you've got two minutes, let us know how it went.`,
      cta: { label: "Leave a review", url: v.review_url },
    }),
  }),

  "prize-winner": (v) => ({
    subject: `You won the ${v.month} drawing 🎉`,
    html: renderHtml({
      preheader: `${v.prize} · we'll be in touch`,
      bodyBlocks: [
        h1(`You won the ${escapeHtml(v.month)} drawing`),
        p("No, really."),
        p(`Prize: <strong>${escapeHtml(v.prize)}</strong>`),
        p(
          `Reply to this email (or write to <a href="mailto:${escapeHtml(v.fulfillment_email)}" style="color:#5b3a8a;">${escapeHtml(v.fulfillment_email)}</a>) with your name + shipping address and we'll get it out.`,
        ),
        p("Must be 21+. CA only. Limit one win per household per quarter."),
      ],
    }),
    text: renderText({
      body: `You won the ${v.month} drawing.

Prize: ${v.prize}

Reply with your shipping address (or write to ${v.fulfillment_email}) and we'll get it out.

Must be 21+. CA only.`,
    }),
  }),

  "health-alert": (v) => ({
    subject: `[admin] integration alert: ${v.integration}`,
    html: renderHtml({
      bodyBlocks: [
        h1(`Integration alert: ${escapeHtml(v.integration)}`),
        p(escapeHtml(v.detail)),
        p(`At: ${escapeHtml(v.timestamp)}`),
      ],
    }),
    text: renderText({
      body: `Integration alert: ${v.integration}
${v.detail}
At: ${v.timestamp}`,
    }),
  }),
};

// Sanity references to keep TS happy about unused vars in some templates.
void STOP_FOOTER;

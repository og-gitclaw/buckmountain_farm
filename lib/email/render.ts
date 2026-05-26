/**
 * Minimal HTML+text email renderer.
 *
 * No React Email, no MJML, no Handlebars — just template literals on top of
 * a single shared shell. Keeps the bundle thin and emails render reliably
 * across the standard clients (Gmail, Apple Mail, Outlook 365).
 *
 * Design goals:
 *   - One <table>-based shell so Outlook doesn't mangle the layout
 *   - Inline styles only (no <style> tag) for max client compatibility
 *   - Dark-on-light by default — most readers default to light
 *   - 600px container, mobile-fluid via max-width:100% on images
 *
 * Brand tokens (kept in sync with app/globals.css):
 *   - accent gold:    #c9a24a
 *   - frame purple:   #5b3a8a
 *   - text dark:      #1a1a1a
 *   - muted:          #555555
 *   - hairline:       #e5e0d7
 */

export type RenderOpts = {
  brand?: { name: string; siteUrl: string; logoUrl?: string; tagline?: string };
  /** Single CTA — rendered as a centered button when present. */
  cta?: { label: string; url: string };
  /** Preheader: hidden inbox preview text (first 80-100 chars shown by clients). */
  preheader?: string;
  /** Optional footer bits like "© 2026 Buck Mountain — unsubscribe link". */
  footerLines?: string[];
};

const DEFAULT_BRAND = {
  name: "Buck Mountain Cannabis",
  siteUrl: "https://buckmountain.farm",
  tagline: "Always grinding for the highest quality",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Render a paragraph or block of text. `body` may include &lt;br&gt; / inline tags
 *  but NEVER block-level structure — wrap that in additional renderBlock calls. */
export function p(body: string, color = "#1a1a1a"): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${color};">${body}</p>`;
}

export function h1(body: string): string {
  return `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#1a1a1a;font-weight:700;">${escapeHtml(body)}</h1>`;
}

export function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e0d7;margin:24px 0;" />`;
}

export function renderHtml(opts: {
  preheader?: string;
  bodyBlocks: string[];
  cta?: { label: string; url: string };
  brand?: RenderOpts["brand"];
  footerLines?: string[];
}): string {
  const brand = { ...DEFAULT_BRAND, ...(opts.brand ?? {}) };
  const ctaHtml = opts.cta
    ? `
      <tr><td align="center" style="padding:8px 0 24px;">
        <a href="${escapeHtml(opts.cta.url)}"
           style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.02em;">
          ${escapeHtml(opts.cta.label)}
        </a>
      </td></tr>`
    : "";
  const footer = (opts.footerLines ?? [
    `${brand.name} · Nevada County, California`,
    `<a href="${brand.siteUrl}" style="color:#5b3a8a;text-decoration:none;">${brand.siteUrl.replace(/^https?:\/\//, "")}</a>`,
  ])
    .map(
      (line) =>
        `<p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#888;">${line}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(brand.name)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
${opts.preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f5f0;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #e5e0d7;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:20px 28px 12px;border-bottom:1px solid #e5e0d7;">
        <span style="font-size:13px;letter-spacing:0.25em;text-transform:uppercase;color:#5b3a8a;font-weight:700;">${escapeHtml(brand.name)}</span>
        ${brand.tagline ? `<br /><span style="font-size:12px;color:#888;letter-spacing:0.06em;">${escapeHtml(brand.tagline)}</span>` : ""}
      </td></tr>
      <tr><td style="padding:28px;">
        ${opts.bodyBlocks.join("\n")}
      </td></tr>
      ${ctaHtml}
      <tr><td style="padding:18px 28px;background:#fafaf7;border-top:1px solid #e5e0d7;">
        ${footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Plain-text companion. We hand-write text bodies per template; this just
 *  decorates with a footer for parity with the HTML version. */
export function renderText(opts: {
  body: string;
  cta?: { label: string; url: string };
  brand?: RenderOpts["brand"];
}): string {
  const brand = { ...DEFAULT_BRAND, ...(opts.brand ?? {}) };
  const ctaText = opts.cta ? `\n\n${opts.cta.label}: ${opts.cta.url}` : "";
  return `${opts.body.trim()}${ctaText}

--
${brand.name} · Nevada County, California
${brand.siteUrl}`;
}

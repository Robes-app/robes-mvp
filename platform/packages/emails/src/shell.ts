import { palette } from '@robes/tokens';

// The one email layout (ported from legacy notify.js mailShell): cream ground, one serif heading,
// at most three images, one ink button, the footer. Tables and inline styles, for mail clients.
export interface EmailContent {
  heading: string;
  // Plain text; escaped here. Emphasis is not supported, so copy can never inject markup.
  body: string;
  images?: readonly string[];
  cta?: { label: string; url: string };
  footer?: string;
  // Why she's getting it, shown above the unsubscribe link.
  notice: string;
  // Omitted for one-off transactional mail (e.g. confirming a waitlist signup).
  unsubUrl?: string;
  unsubLabel?: string;
  privacyUrl: string;
  privacyLabel: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const isHttp = (url: string): boolean => /^https?:\/\//.test(url);
const serif = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const sans = 'Helvetica,Arial,sans-serif';

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const e = escapeHtml;
  const images = (c.images ?? []).filter(isHttp).slice(0, 3);
  const width = images.length === 1 ? 360 : 170;
  const imageRow = images.length
    ? `<tr><td style="padding:0 0 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${images
        .map(
          (u) =>
            `<td style="padding:0 4px;width:${Math.floor(100 / images.length)}%" valign="top"><img src="${e(u)}" width="${width}" alt="" style="display:block;width:100%;max-width:${width}px;height:auto;border-radius:6px;margin:0 auto"></td>`,
        )
        .join('')}</tr></table></td></tr>`
    : '';
  const cta = c.cta
    ? `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${palette.ink};border-radius:100px"><a href="${e(c.cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${sans};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${palette.white};text-decoration:none">${e(c.cta.label)}</a></td></tr></table></td></tr>`
    : '';
  const footer = c.footer
    ? `<tr><td style="padding:18px 0 0;font-family:${sans};font-size:13px;line-height:1.6;color:${palette.inkSoft}">${e(c.footer)}</td></tr>`
    : '';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${e(c.heading)}</title></head>
<body style="margin:0;padding:0;background:${palette.cream50}">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${e(c.body)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${palette.cream50}"><tr><td align="center" style="padding:32px 16px 40px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px">
<tr><td style="padding:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:.28em;text-transform:uppercase;color:${palette.ink}">Robes</td></tr>
<tr><td style="background:${palette.white};border:1px solid ${palette.cream300};border-radius:10px;padding:32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="padding:0 0 14px;font-family:${serif};font-size:30px;line-height:1.15;font-weight:300;color:${palette.ink}">${e(c.heading)}</td></tr>
<tr><td style="padding:0 0 22px;font-family:${sans};font-size:15px;line-height:1.65;color:${palette.ink800}">${e(c.body)}</td></tr>
${imageRow}
${cta}
${footer}
</table></td></tr>
<tr><td style="padding:22px 6px 0;font-family:${sans};font-size:11px;line-height:1.6;color:${palette.inkFaint}">${e(c.notice)} ${c.unsubUrl && c.unsubLabel ? `<a href="${e(c.unsubUrl)}" style="color:${palette.inkFaint}">${e(c.unsubLabel)}</a> · ` : ''}<a href="${e(c.privacyUrl)}" style="color:${palette.inkFaint}">${e(c.privacyLabel)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    c.heading,
    '',
    c.body,
    '',
    ...(c.cta ? [`${c.cta.label}: ${c.cta.url}`, ''] : []),
    ...(c.footer ? [c.footer, ''] : []),
    ...(c.unsubUrl && c.unsubLabel ? [`${c.unsubLabel}: ${c.unsubUrl}`] : []),
  ].join('\n');
  return { html, text };
}

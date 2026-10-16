import PostalMime from 'postal-mime';
import { z } from 'zod';
import { htmlToText } from './html';

// Inbound mail limits (SEC-30-ish): SES caps a message at 40 MB; we read at most 10 MB, ignore
// attachments entirely and only ever pass sanitised text to the model.
export const MAX_RAW_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 60_000;

export interface InboundMail {
  from: string;
  to: string[];
  subject: string;
  text: string;
}

export async function parseMail(raw: Uint8Array): Promise<InboundMail | null> {
  if (raw.byteLength === 0 || raw.byteLength > MAX_RAW_BYTES) return null;
  const email = await PostalMime.parse(raw, { attachmentEncoding: 'arraybuffer' });
  const text = email.html
    ? htmlToText(email.html, MAX_TEXT_CHARS)
    : (email.text ?? '').trim().slice(0, MAX_TEXT_CHARS);
  return {
    from: (email.from?.address ?? '').slice(0, 300),
    to: [...(email.to ?? []), ...(email.cc ?? [])].flatMap((a) =>
      a.address ? [a.address] : (a.group ?? []).flatMap((g) => (g.address ? [g.address] : [])),
    ),
    subject: (email.subject ?? '').slice(0, 300),
    text,
  };
}

// "Niall <abcd…@in.mail.byrobes.com>" → "abcd…" when the domain matches (legacy localPartOf).
export function localPartOf(address: string, domain: string): string | null {
  const m = address.toLowerCase().match(/([a-z0-9._+-]+)@([a-z0-9.-]+)/);
  if (!m || m[2] !== domain.toLowerCase()) return null;
  return m[1] ?? null;
}

// The SES receipt notification (S3 action with an SNS topic), delivered raw through SQS.
const Verdict = z.object({ status: z.string() });
export const SesNotification = z.object({
  notificationType: z.literal('Received'),
  mail: z.object({ messageId: z.string().min(1).max(200) }),
  receipt: z.object({
    recipients: z.array(z.string()).max(50),
    spfVerdict: Verdict,
    dkimVerdict: Verdict,
    spamVerdict: Verdict,
    virusVerdict: Verdict,
    action: z.object({ type: z.literal('S3'), objectKey: z.string().startsWith('inbound/') }),
  }),
});
export type SesNotification = z.infer<typeof SesNotification>;

// A forwarded receipt must not fail any check SES ran; unavailable (GRAY) checks don't drop it.
export function verdictsPass(receipt: SesNotification['receipt']): boolean {
  return [receipt.spfVerdict, receipt.dkimVerdict, receipt.spamVerdict, receipt.virusVerdict].every(
    (v) => v.status !== 'FAIL',
  );
}

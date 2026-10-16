import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { htmlToText } from './html';
import { localPartOf, MAX_RAW_BYTES, parseMail, SesNotification, verdictsPass } from './mail';

const EML = readFileSync(new URL('./fixtures/receipt.eml', import.meta.url));

export function notification(over: Partial<SesNotification['receipt']> = {}) {
  const pass = { status: 'PASS' };
  return SesNotification.parse({
    notificationType: 'Received',
    mail: { messageId: 'ses-message-1' },
    receipt: {
      recipients: ['abcdefghij0123456789@in.robes.local'],
      spfVerdict: pass,
      dkimVerdict: pass,
      spamVerdict: pass,
      virusVerdict: pass,
      action: { type: 'S3', objectKey: 'inbound/ses-message-1' },
      ...over,
    },
  });
}

describe('inbound mail', () => {
  it('reads the HTML part as text, keeping product images as lines and dropping pixels, scripts and attachments', async () => {
    const mail = await parseMail(new Uint8Array(EML));
    expect(mail).toMatchObject({
      from: 'niall@test.dev',
      to: ['abcdefghij0123456789@in.robes.local'],
      subject: 'Fwd: Your Sézane order SZ-100200',
    });
    expect(mail?.text).toContain('[image: https://cdn.example.com/coat.jpg | Camel wool coat]');
    expect(mail?.text).toContain('€340.00');
    expect(mail?.text).not.toMatch(/open\.gif|alert\(1\)|color:red|JVBER/);
  });

  it('refuses empty and oversized mail before parsing', async () => {
    expect(await parseMail(new Uint8Array())).toBeNull();
    expect(await parseMail(new Uint8Array(MAX_RAW_BYTES + 1))).toBeNull();
  });

  it('caps the text it hands on', () => {
    expect(htmlToText(`<p>${'a'.repeat(100)}</p>`, 10)).toHaveLength(10);
  });

  it('only accepts our domain', () => {
    expect(localPartOf('Niall <ABC123@in.robes.local>', 'in.robes.local')).toBe('abc123');
    expect(localPartOf('abc123@in.evil.test', 'in.robes.local')).toBeNull();
    expect(localPartOf('not an address', 'in.robes.local')).toBeNull();
  });

  it('drops mail that fails any SES check but not unavailable ones', () => {
    expect(verdictsPass(notification().receipt)).toBe(true);
    expect(verdictsPass(notification({ dkimVerdict: { status: 'GRAY' } }).receipt)).toBe(true);
    for (const key of ['spfVerdict', 'dkimVerdict', 'spamVerdict', 'virusVerdict'] as const) {
      expect(verdictsPass(notification({ [key]: { status: 'FAIL' } }).receipt)).toBe(false);
    }
  });

  it('only reads objects under inbound/', () => {
    expect(() =>
      notification({ action: { type: 'S3', objectKey: 'media/someone-else/master.jpg' } }),
    ).toThrow();
  });
});

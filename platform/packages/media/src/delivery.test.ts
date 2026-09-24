import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCloudFrontDelivery, dayStableWindow } from './delivery';
import { mediaKeys } from './keys';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const ORIGIN = 'https://media.example.test';
const USER = '11111111-1111-4111-8111-111111111111';
const KEY = mediaKeys.rendition(USER, '22222222-2222-4222-8222-222222222222', 640, 'avif');

const delivery = createCloudFrontDelivery({
  origin: ORIGIN,
  keyPairId: 'KTESTKEYPAIR',
  privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
  cookieDomain: 'example.test',
});

// CloudFront's URL-safe base64: + → -, = → _, / → ~.
function fromCloudFrontBase64(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/'), 'base64');
}

function verifies(policy: string, signature: string): boolean {
  return createVerify('RSA-SHA1').update(policy).verify(publicKey, fromCloudFrontBase64(signature));
}

describe('dayStableWindow', () => {
  it('is identical all day and valid for at least 24 h', () => {
    const morning = dayStableWindow(new Date('2026-09-24T00:00:01Z'));
    const night = dayStableWindow(new Date('2026-09-24T23:59:59Z'));
    expect(morning).toEqual(night);
    expect(morning.signedAt.toISOString()).toBe('2026-09-24T00:00:00.000Z');
    expect(morning.expiresAt.toISOString()).toBe('2026-09-26T00:00:00.000Z');
  });
});

describe('CloudFront delivery', () => {
  it('signs canned-policy URLs that verify against the public key and are stable per day', async () => {
    const now = new Date('2026-09-24T09:00:00Z');
    const url = new URL(await delivery.url(KEY, now));
    expect(`${url.origin}${url.pathname}`).toBe(`${ORIGIN}/${KEY}`);
    expect(url.searchParams.get('Key-Pair-Id')).toBe('KTESTKEYPAIR');
    const expires = Number(url.searchParams.get('Expires'));
    expect(expires).toBe(dayStableWindow(now).expiresAt.getTime() / 1000);

    const canned = JSON.stringify({
      Statement: [
        { Resource: `${ORIGIN}/${KEY}`, Condition: { DateLessThan: { 'AWS:EpochTime': expires } } },
      ],
    });
    expect(verifies(canned, url.searchParams.get('Signature') ?? '')).toBe(true);
    expect(verifies(canned.replace(KEY, `${KEY}x`), url.searchParams.get('Signature') ?? '')).toBe(
      false,
    );
    expect(await delivery.url(KEY, new Date('2026-09-24T21:00:00Z'))).toBe(url.toString());
  });

  it('issues cookies scoped to the caller’s media prefix for 12 h', () => {
    const now = new Date('2026-09-24T09:00:00Z');
    const cookies = delivery.sessionCookies(USER, now);
    expect(cookies.map((c) => c.name).sort()).toEqual([
      'CloudFront-Key-Pair-Id',
      'CloudFront-Policy',
      'CloudFront-Signature',
    ]);
    for (const c of cookies) {
      expect(c.path).toBe(`/media/${USER}/`);
      expect(c.domain).toBe('example.test');
      expect(c.expires.toISOString()).toBe('2026-09-24T21:00:00.000Z');
    }
    const value = (name: string): string => cookies.find((c) => c.name === name)?.value ?? '';
    const policy = fromCloudFrontBase64(value('CloudFront-Policy')).toString();
    expect(JSON.parse(policy).Statement[0].Resource).toBe(`${ORIGIN}/media/${USER}/*`);
    expect(verifies(policy, value('CloudFront-Signature'))).toBe(true);
  });
});

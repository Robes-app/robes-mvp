import { createHmac, timingSafeEqual } from 'node:crypto';

// One-click unsubscribe tokens: `${userId}.${pref}.${mac}` flips ONE notification preference
// without a login. The MAC covers both, so a token can't be retargeted (legacy notify.js).
export const UNSUB_PREFS = ['looksReady', 'morningCue', 'nudges', 'receipts'] as const;
export type UnsubPref = (typeof UNSUB_PREFS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mac(secret: string, userId: string, pref: UnsubPref): string {
  return createHmac('sha256', secret).update(`${userId}:${pref}`).digest('base64url');
}

export function signUnsub(secret: string, userId: string, pref: UnsubPref): string {
  return `${userId}.${pref}.${mac(secret, userId, pref)}`;
}

export function verifyUnsub(
  secret: string,
  token: string,
): { userId: string; pref: UnsubPref } | null {
  const [userId, pref, given, ...rest] = token.split('.');
  if (rest.length || !userId || !pref || !given || !UUID.test(userId)) return null;
  if (!(UNSUB_PREFS as readonly string[]).includes(pref)) return null;
  const expected = Buffer.from(mac(secret, userId, pref as UnsubPref));
  const actual = Buffer.from(given);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { userId, pref: pref as UnsubPref };
}

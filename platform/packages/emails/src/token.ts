import { createHmac, timingSafeEqual } from 'node:crypto';

// Single-purpose signed tokens (`${subject}.${mac}`): the purpose is inside the MAC, so a token
// minted for one flow (e.g. waitlist confirmation) never works for another.
function mac(secret: string, purpose: string, subject: string): string {
  return createHmac('sha256', secret).update(`${purpose}:${subject}`).digest('base64url');
}

export function signToken(secret: string, purpose: string, subject: string): string {
  if (subject.includes('.')) throw new Error('token subject must not contain "."');
  return `${subject}.${mac(secret, purpose, subject)}`;
}

export function verifyToken(secret: string, purpose: string, token: string): string | null {
  const [subject, given, ...rest] = token.split('.');
  if (rest.length || !subject || !given) return null;
  const expected = Buffer.from(mac(secret, purpose, subject));
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? subject : null;
}

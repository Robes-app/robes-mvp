// SEC-83: fields that may carry personal data or prompts never reach logs.
export const REDACTED_KEYS = [
  'email',
  'name',
  'firstName',
  'lastName',
  'mobile',
  'instagramHandle',
  'prompt',
  'text',
  'note',
  'otp',
  'code',
  'token',
  'cookie',
  'authorization',
  'password',
  'url',
  'imageUrl',
  'body',
] as const;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const REDACTED = '[redacted]';
const KEYS = new Set<string>(REDACTED_KEYS.map((k) => k.toLowerCase()));

// Deep-scrubs values by key and removes email addresses from any string (e.g. error messages).
export function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.replace(EMAIL, REDACTED);
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (value instanceof Error) {
    return { type: value.name, message: scrub(value.message, depth + 1) };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = KEYS.has(key.toLowerCase()) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

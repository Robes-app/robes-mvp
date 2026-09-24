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

type Bag = Record<string, unknown>;

// Sentry's own contexts carry `name` keys (os, runtime, browser) that are not personal data.
const SDK_CONTEXTS = new Set(['os', 'runtime', 'browser', 'device', 'app', 'culture', 'trace']);
// Everything else (cookies, auth, forwarded IPs) is dropped from captured requests.
const SAFE_HEADERS = new Set(['accept', 'content-type', 'user-agent', 'x-robes-app-version']);

function isBag(value: unknown): value is Bag {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripQuery(url: unknown): unknown {
  return typeof url === 'string' ? scrub(url.split(/[?#]/)[0]) : url;
}

export function scrubBreadcrumb<T>(breadcrumb: T): T {
  if (!isBag(breadcrumb)) return breadcrumb;
  const out: Bag = { ...breadcrumb };
  if (typeof out.message === 'string') out.message = scrub(out.message);
  if (isBag(out.data)) {
    const { url, to, from, ...rest } = out.data;
    out.data = {
      ...(scrub(rest) as Bag),
      ...(url === undefined ? {} : { url: stripQuery(url) }),
      ...(to === undefined ? {} : { to: stripQuery(to) }),
      ...(from === undefined ? {} : { from: stripQuery(from) }),
    };
  }
  return out as T;
}

// Sentry beforeSend (SEC-83): same redaction as the logger, keeping the fields Sentry needs.
export function scrubEvent<T>(event: T): T {
  if (!isBag(event)) return event;
  const out: Bag = { ...event };
  if (typeof out.message === 'string') out.message = scrub(out.message);
  if (isBag(out.logentry)) out.logentry = scrub(out.logentry);
  if (isBag(out.exception) && Array.isArray(out.exception.values)) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((v: unknown) =>
        isBag(v) && typeof v.value === 'string' ? { ...v, value: scrub(v.value) } : v,
      ),
    };
  }
  for (const key of ['extra', 'tags'] as const) if (out[key]) out[key] = scrub(out[key]);
  if (isBag(out.contexts)) {
    out.contexts = Object.fromEntries(
      Object.entries(out.contexts).map(([k, v]) => [k, SDK_CONTEXTS.has(k) ? v : scrub(v)]),
    );
  }
  if (isBag(out.request)) {
    const { url, headers, cookies: _c, data: _d, query_string: _q, ...rest } = out.request;
    out.request = {
      ...rest,
      ...(url === undefined ? {} : { url: stripQuery(url) }),
      ...(isBag(headers)
        ? {
            headers: Object.fromEntries(
              Object.entries(headers).filter(([k]) => SAFE_HEADERS.has(k.toLowerCase())),
            ),
          }
        : {}),
    };
  }
  if (isBag(out.user)) out.user = out.user.id === undefined ? {} : { id: out.user.id };
  if (Array.isArray(out.breadcrumbs)) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb);
  return out as T;
}

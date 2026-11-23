// An event's metadata as short label/value pairs for the admin activity feed (beta's metaLine):
// empty values dropped, lists joined, anything nested written as JSON, every value capped.
const MAX_PAIRS = 8;
const MAX_VALUE = 120;

const cap = (v: string) => (v.length > MAX_VALUE ? `${v.slice(0, MAX_VALUE - 1)}…` : v);

function show(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v) && v.every((x) => ['string', 'number', 'boolean'].includes(typeof x))) {
    return v.length ? v.join(',') : null;
  }
  return JSON.stringify(v);
}

export function eventMeta(metadata: unknown): [string, string][] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries(metadata)) {
    const s = show(v);
    if (s !== null) pairs.push([k, cap(s)]);
    if (pairs.length === MAX_PAIRS) break;
  }
  return pairs;
}

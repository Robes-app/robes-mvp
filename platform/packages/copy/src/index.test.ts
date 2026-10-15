import { describe, expect, it } from 'vitest';
import { copy } from './index';

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function')
    return [String((value as (...a: unknown[]) => unknown)('Niall', 9))];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

const all = strings(copy);

// brand-and-design.md §1 "Retired or forbidden in chrome" + banned constructions.
const BANNED: Array<[RegExp, string]> = [
  [/\bAI\b/, 'never "AI"'],
  [/generat/i, '"Generating" is banned'],
  [/\b(un)?lock/i, 'never lock/unlock'],
  [/!/, 'no exclamation marks'],
  [/\bcalendar\b/i, 'Diary/Plan, not Calendar'],
  [/\bholiday\b/i, 'Travel edit, not Holiday'],
  [/nothing yet/i, 'never "Nothing yet"'],
  [/\b(item|garment)s?\b/i, 'say "piece"'],
  [/\b(perfect|ideal|suitable|great) for\b/i, 'no benefit justification'],
  [
    /\b(effortlessly|seamlessly|timelessly|meticulously|elevated|versatile)\b/i,
    'no inflated adjectives',
  ],
  [/'/, 'use a curly apostrophe (’)'],
  [/\.\.\./, 'use the ellipsis character (…)'],
];

describe('copy voice', () => {
  it('has strings to check', () => expect(all.length).toBeGreaterThan(30));

  it.each(BANNED)('%s', (pattern, rule) => {
    const offenders = all.filter((s) => pattern.test(s));
    expect(offenders, rule).toEqual([]);
  });
});

describe('next line counts', () => {
  it('names the pieces she has filed, never "Five" at fifty (legacy b3de655)', async () => {
    const { nextLine } = await import('./index');
    expect(nextLine({ rule: 'build', count: 7 }).text).toBe(
      'Seven pieces filed. Build a look from what you own.',
    );
    expect(nextLine({ rule: 'build', count: 16 }).text).toMatch(/^16 pieces filed/);
  });
});

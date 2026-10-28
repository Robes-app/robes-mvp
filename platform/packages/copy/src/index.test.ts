import { describe, expect, it } from 'vitest';
import { copy } from './index';

// Copy takes names, counts and lists; every shape is probed so none escapes the voice rules.
const PROBES: unknown[][] = [
  ['Niall', 9],
  [['Loafers'], ['Straight jeans']],
];

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    const fn = value as (...a: unknown[]) => unknown;
    const out: string[] = [];
    for (const args of PROBES) {
      try {
        out.push(String(fn(...args)));
      } catch {
        // Not this function's shape of argument; another probe will be.
      }
    }
    return out;
  }
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

describe('a saved look’s meta line', () => {
  it('ends on the next day it is pinned for, when it has one (beta)', async () => {
    const { lookbook } = await import('./index');
    const facts = { pieces: 3, timesWorn: 2, lastWorn: '23 Jul', around: null };
    expect(lookbook.meta.saved({ ...facts, pinnedFor: 'Tuesday 29 Sep' })).toBe(
      '3 pieces · 2 wears · last 23 Jul · pinned for Tuesday 29 Sep',
    );
    expect(lookbook.meta.saved(facts)).toBe('3 pieces · 2 wears · last 23 Jul');
  });
});

describe('the day’s advice', () => {
  it('reads the condition first, then the high', async () => {
    const { plan } = await import('./index');
    expect(plan.day.advice('light rain', '8–12°C')).toBe('Bring a shell for the rain.');
    expect(plan.day.advice('clear', '3–9°C')).toBe('A proper coat today.');
    expect(plan.day.advice('partly cloudy', '10–15°C')).toBe('Bring one warm layer.');
    expect(plan.day.advice('clear', '18–27°C')).toBe('Light and breathable.');
    expect(plan.day.advice('overcast', '12–19°C')).toBe('Easy layers.');
  });
});

describe('the weather line', () => {
  it('reads the weekday, the city and the temperature, the conditions spoken first', async () => {
    const { home, plan } = await import('./index');
    expect(home.meta('Wednesday', 'Dublin', '13°C')).toBe('Wednesday · Dublin · 13°C');
    expect(home.meta('Wednesday', null, null)).toBe('Wednesday');
    expect(home.metaSpoken('overcast', 'Wednesday · Dublin · 13°C')).toBe(
      'overcast · Wednesday · Dublin · 13°C',
    );
    expect(home.metaSpoken(null, 'Wednesday')).toBe('Wednesday');
    expect(home.weather('Dublin', '13°C', 'overcast')).toBe('Dublin · 13°C · overcast');
    expect(plan.day.weather('Dublin', 'light rain', '9–14°C')).toBe('Dublin · light rain · 9–14°C');
  });
});

describe('season labels', () => {
  it('spell a band one way on the wardrobe, the Lookbook and a look', () => {
    expect(copy.lookbook.refine.seasons).toBe(copy.wardrobe.filter.seasons);
    expect(copy.lookbook.refine.seasons.spring_summer).toBe('Spring/Summer');
  });
});

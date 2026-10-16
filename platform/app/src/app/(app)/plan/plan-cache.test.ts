import { describe, expect, it } from 'vitest';
import { withoutEntry } from './plan-cache';

describe('withoutEntry', () => {
  it('drops the entry from its day and leaves everything else', () => {
    const plan = {
      from: '2026-10-01',
      to: '2026-10-02',
      days: [
        { date: '2026-10-01', entries: [{ id: 'a' }, { id: 'b' }] },
        { date: '2026-10-02', entries: [{ id: 'c' }] },
      ],
    };
    const next = withoutEntry('b')(plan) as typeof plan;
    expect(next.days.map((d) => d.entries.map((e) => e.id))).toEqual([['a'], ['c']]);
    expect(withoutEntry('b')(undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { day, stamp, when } from './dates';

describe('admin dates', () => {
  it('prints months from the calendar table, never "Sept"', () => {
    expect(when('2026-09-15T07:13:00.000Z', '—')).toBe('15 Sep 2026, 07:13 UTC');
    expect(day('2026-09-15T23:59:00.000Z', '—')).toBe('15 Sep 2026');
    expect(stamp('2026-10-17T07:13:00.000Z')).toBe('17 Oct 07:13');
    expect(when(null, '—')).toBe('—');
  });
});

import { describe, expect, it } from 'vitest';
import { dayLabel, formatDay, localToday } from './dates';

describe('dates', () => {
  it('uses the local calendar day for today', () => {
    expect(localToday(new Date(2026, 8, 24, 23, 59))).toBe('2026-09-24');
    expect(localToday(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('labels today, tomorrow and other days without timezone drift', () => {
    expect(dayLabel('2026-09-24', '2026-09-24')).toBe('Today');
    expect(dayLabel('2026-10-01', '2026-09-30')).toBe('Tomorrow');
    expect(dayLabel('2026-10-03', '2026-09-30')).toBe(formatDay('2026-10-03'));
    expect(formatDay('2026-10-03')).toBe('Sat 3 Oct');
  });
});

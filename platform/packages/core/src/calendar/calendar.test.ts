import { describe, expect, it } from 'vitest';
import { addDays, monthGrid, monthLabel, shiftMonth } from './index';

describe('calendar', () => {
  it('builds a Monday-first month grid', () => {
    const october = monthGrid('2026-10');
    expect(october).toMatchObject({ from: '2026-10-01', days: 31 });
    // 1 Oct 2026 is a Thursday: three blank cells first.
    expect(october.cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(october.cells.length % 7).toBe(0);
    expect(monthGrid('2027-02').days).toBe(28);
  });

  it('moves across months and years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(monthLabel('2026-10')).toBe('October 2026');
  });
});

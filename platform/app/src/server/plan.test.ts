import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ repos: {} }));
vi.mock('./looks-entity', () => ({ toLooks: vi.fn() }));
vi.mock('./flags', () => ({ isFlagEnabled: vi.fn() }));

const { addDays, todayIn, withoutTripLooks } = await import('./plan');

describe('plan dates', () => {
  it('uses her timezone for today', () => {
    const lateUtc = new Date('2026-09-24T23:30:00Z');
    expect(todayIn('Europe/Dublin', lateUtc)).toBe('2026-09-25');
    expect(todayIn('America/New_York', lateUtc)).toBe('2026-09-24');
    expect(todayIn('Australia/Sydney', new Date('2026-09-24T15:00:00Z'))).toBe('2026-09-25');
  });

  it('adds calendar days across month ends and DST changes', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('trip looks on the plan', () => {
  const entry = (source: string) => ({ look: { source } }) as never;

  it('hides looks placed by a trip while trips are off, and shows them when on', () => {
    const entries = [entry('daily'), entry('travel'), entry('manual')];
    expect(withoutTripLooks(entries, false)).toHaveLength(2);
    expect(withoutTripLooks(entries, true)).toHaveLength(3);
  });
});

import { describe, expect, it } from 'vitest';
import { defaultTripDates, parseOccasions, tripDatesError } from './index';

describe('trip intake', () => {
  it('defaults to a long weekend a week out', () => {
    expect(defaultTripDates('2026-09-28')).toEqual({
      dateFrom: '2026-10-05',
      dateTo: '2026-10-07',
    });
  });

  it('reads her plans one per line or comma', () => {
    expect(parseOccasions('Beach day\n dinner out, Beach Day,\n\nMarket')).toEqual([
      'Beach day',
      'dinner out',
      'Market',
    ]);
  });

  it('matches the API date rules', () => {
    expect(tripDatesError('2026-10-02', '2026-10-01')).toBe('endsBefore');
    expect(tripDatesError('2026-10-01', '2026-10-11')).toBe('tooLong');
    expect(tripDatesError('2026-10-01', '2026-10-10')).toBeNull();
  });
});

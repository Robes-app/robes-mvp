import { describe, expect, it } from 'vitest';
import { LOCATION_REFRESH_MS, locationStep, parseSentAt } from './index';

const now = 1_800_000_000_000;

describe('location step', () => {
  it('asks once, then never again unless she allowed it', () => {
    expect(locationStep({ asked: false, allowed: false, lastSentAt: null, now })).toBe('ask');
    expect(locationStep({ asked: true, allowed: false, lastSentAt: null, now })).toBe('none');
  });

  it('refreshes an allowed location at most every few hours', () => {
    expect(locationStep({ asked: true, allowed: true, lastSentAt: null, now })).toBe('refresh');
    const recent = now - LOCATION_REFRESH_MS + 1;
    expect(locationStep({ asked: true, allowed: true, lastSentAt: recent, now })).toBe('none');
    const stale = now - LOCATION_REFRESH_MS;
    expect(locationStep({ asked: true, allowed: true, lastSentAt: stale, now })).toBe('refresh');
    // Allowed outside the app (the OS setting) counts, asked or not.
    expect(locationStep({ asked: false, allowed: true, lastSentAt: null, now })).toBe('refresh');
  });

  it('reads a stored timestamp defensively', () => {
    expect(parseSentAt('1800000000000')).toBe(now);
    expect(parseSentAt(null)).toBeNull();
    expect(parseSentAt('soon')).toBeNull();
  });
});

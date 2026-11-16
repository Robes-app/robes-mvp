import { afterEach, describe, expect, it } from 'vitest';
import { dayReturn, setDayOrigin } from './day-origin';

afterEach(() => setDayOrigin('home'));

describe('where a look made for a day goes back to', () => {
  it('Home’s day by default, naming the look just saved', () => {
    expect(dayReturn('2026-11-21')).toBe('/?day=2026-11-21');
    expect(dayReturn('2026-11-21', 'abc')).toBe('/?day=2026-11-21&saved=abc');
  });

  it('the Diary’s day page when the day was opened there', () => {
    setDayOrigin('diary');
    expect(dayReturn('2026-12-12')).toBe('/plan/2026-12-12');
    expect(dayReturn('2026-12-12', 'abc')).toBe('/plan/2026-12-12');
  });
});

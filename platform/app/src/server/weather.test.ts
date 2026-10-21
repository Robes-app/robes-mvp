import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const profile = { timezone: 'Europe/Dublin', homeCity: 'Dublin', homeLat: null, homeLon: null };
const repos = { profiles: { get: vi.fn(async () => profile) } };
const weatherFor = vi.fn(async () => ({
  city: 'Dublin',
  month: 'October',
  tempRange: '9–14°C',
  condition: 'light rain',
}));
const made = { n: 0 };
const createWeather = () => {
  made.n += 1;
  return weatherFor;
};
vi.mock('./db', () => ({ repos }));
vi.mock('./plan', () => ({
  todayIn: () => '2026-10-16',
  addDays: (d: string, n: number) =>
    new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10),
}));
vi.mock('@robes/jobs', () => ({ createWeather }));

const { loadTodayWeather } = await import('./weather');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');

describe('today weather', () => {
  it('shares one cached forecaster across requests, keyed by her city and day', async () => {
    const now = new Date('2026-10-16T09:00:00Z');
    expect(await loadTodayWeather(ann, now)).toEqual({
      city: 'Dublin',
      tempRange: '9–14°C',
      condition: 'light rain',
    });
    await loadTodayWeather(ann, now);
    expect(made.n).toBe(1);
    expect(weatherFor).toHaveBeenCalledTimes(2);
    expect(weatherFor).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: 'Dublin', date: '2026-10-16' }),
    );
  });

  it('reads a day page’s own date, and nothing outside the forecast’s reach', async () => {
    const now = new Date('2026-10-16T09:00:00Z');
    await loadTodayWeather(ann, now, '2026-10-20');
    expect(weatherFor).toHaveBeenLastCalledWith(expect.objectContaining({ date: '2026-10-20' }));
    const calls = weatherFor.mock.calls.length;
    expect(await loadTodayWeather(ann, now, '2026-10-15')).toBeNull();
    expect(await loadTodayWeather(ann, now, '2026-11-30')).toBeNull();
    expect(weatherFor).toHaveBeenCalledTimes(calls);
  });

  it('no forecast reads as no line', async () => {
    weatherFor.mockResolvedValueOnce(null as never);
    expect(await loadTodayWeather(ann)).toBeNull();
  });
});

import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const profile = { timezone: 'Europe/Dublin', homeCity: 'Dublin', homeLat: null, homeLon: null };
const repos = { profiles: { get: vi.fn(async () => profile) } };
const weatherFor = vi.fn(async () => ({
  city: 'Dublin',
  month: 'October',
  tempRange: '11–15°C',
  condition: 'clear',
  code: 0,
}));
const liveFor = vi.fn(async () => ({ nowC: 13, code: 3 }) as { nowC: number; code: number } | null);
const made = { day: 0, live: 0 };
const createWeather = () => {
  made.day += 1;
  return weatherFor;
};
const createLiveWeather = () => {
  made.live += 1;
  return liveFor;
};
vi.mock('./db', () => ({ repos }));
vi.mock('./plan', () => ({
  todayIn: () => '2026-10-16',
  addDays: (d: string, n: number) =>
    new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10),
}));
vi.mock('@robes/jobs', () => ({ createWeather, createLiveWeather }));

const { loadTodayWeather } = await import('./weather');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');
const now = new Date('2026-10-16T17:00:00Z');

beforeEach(() => {
  weatherFor.mockClear();
  liveFor.mockClear();
});

describe('today weather', () => {
  it('today is live: the temperature and conditions now, beside the day’s range', async () => {
    expect(await loadTodayWeather(ann, now)).toEqual({
      city: 'Dublin',
      tempRange: '11–15°C',
      condition: 'clear',
      nowC: 13,
      code: 3,
    });
    await loadTodayWeather(ann, now);
    expect(made).toEqual({ day: 1, live: 1 });
    expect(weatherFor).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: 'Dublin', date: '2026-10-16' }),
    );
    expect(liveFor).toHaveBeenLastCalledWith({ city: 'Dublin', lat: null, lon: null });
  });

  it('asked for today by date, still live', async () => {
    expect(await loadTodayWeather(ann, now, '2026-10-16')).toMatchObject({ nowC: 13, code: 3 });
  });

  it('without a live reading, the day’s range and code stand in', async () => {
    liveFor.mockResolvedValueOnce(null);
    expect(await loadTodayWeather(ann, now)).toMatchObject({
      tempRange: '11–15°C',
      nowC: null,
      code: 0,
    });
  });

  it('a day ahead reads that day’s forecast and never the live reading', async () => {
    expect(await loadTodayWeather(ann, now, '2026-10-20')).toEqual({
      city: 'Dublin',
      tempRange: '11–15°C',
      condition: 'clear',
      nowC: null,
      code: 0,
    });
    expect(weatherFor).toHaveBeenLastCalledWith(expect.objectContaining({ date: '2026-10-20' }));
    expect(liveFor).not.toHaveBeenCalled();
  });

  it('nothing outside the forecast’s reach', async () => {
    expect(await loadTodayWeather(ann, now, '2026-10-15')).toBeNull();
    expect(await loadTodayWeather(ann, now, '2026-11-30')).toBeNull();
    expect(weatherFor).not.toHaveBeenCalled();
    expect(liveFor).not.toHaveBeenCalled();
  });

  it('no forecast reads as no line', async () => {
    weatherFor.mockResolvedValueOnce(null as never);
    expect(await loadTodayWeather(ann)).toBeNull();
  });
});

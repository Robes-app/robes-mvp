import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const profile = { timezone: 'Europe/Dublin', homeCity: 'Dublin', homeLat: null, homeLon: null };
const lisbon = {
  dayDate: '2026-10-18',
  city: 'Lisbon',
  country: 'Portugal',
  lat: 38.72,
  lon: -9.14,
};
const repos = {
  profiles: { get: vi.fn(async () => profile) },
  plan: { places: vi.fn(async () => [] as (typeof lisbon)[]) },
  jobs: { recent: vi.fn(async () => []) },
  looks: { draftsFor: vi.fn(async () => []) },
};
const loadDiaryWeather = vi.fn(
  async (days: { date: string; place: { city: string | null } | null }[]) =>
    new Map(
      days.map((d) => [
        d.date,
        {
          city: d.place?.city ?? 'Dublin',
          tempRange: '11–15°C',
          condition: 'clear',
          nowC: null,
          code: 0,
        },
      ]),
    ),
);
vi.mock('./db', () => ({ repos }));
vi.mock('./flags', () => ({ isFlagEnabled: async () => false }));
vi.mock('./home', () => ({ loadHome: vi.fn() }));
vi.mock('./jobs', () => ({ toJobSnapshot: vi.fn() }));
vi.mock('./looks', () => ({ toIdeas: vi.fn() }));
vi.mock('./looks-entity', () => ({ toLooks: async () => [] }));
vi.mock('./plan', () => ({
  todayIn: () => '2026-10-16',
  entriesOn: () => [],
  loadPlan: async (_u: unknown, from: string) => ({
    from,
    to: from,
    days: [{ date: from, name: 'Dinner out', entries: [] }],
  }),
}));
vi.mock('./weather', () => ({
  // The forecast's reach, as weather.ts draws it: a fortnight ahead.
  inForecast: (date: string) => date <= '2026-10-31',
  loadDiaryWeather,
}));

const { loadDayCard } = await import('./today');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');

beforeEach(() => {
  loadDiaryWeather.mockClear();
  repos.plan.places.mockResolvedValue([]);
});

describe('the day card', () => {
  it('reads a day as Home draws it, with her today and her home city', async () => {
    const card = await loadDayCard(ann, '2026-10-18');
    expect(card.today).toBe('2026-10-16');
    expect(card.home).toBe('Dublin');
    expect(card.day).toMatchObject({
      date: '2026-10-18',
      name: 'Dinner out',
      place: null,
      weather: { city: 'Dublin', tempRange: '11–15°C' },
      entries: [],
      draft: null,
    });
  });

  it('the place she set on the day decides its weather', async () => {
    repos.plan.places.mockResolvedValue([lisbon]);
    const card = await loadDayCard(ann, '2026-10-18');
    expect(card.day.place).toEqual({
      city: 'Lisbon',
      country: 'Portugal',
      lat: 38.72,
      lon: -9.14,
    });
    expect(card.day.weather?.city).toBe('Lisbon');
    expect(loadDiaryWeather).toHaveBeenCalledWith(
      [{ date: '2026-10-18', place: card.day.place }],
      { city: 'Dublin', lat: null, lon: null },
      { from: '2026-10-18', to: '2026-10-18' },
    );
  });

  it('past the forecast there is no weather, and none is asked for', async () => {
    const card = await loadDayCard(ann, '2026-12-12');
    expect(card.day.weather).toBeNull();
    expect(card.home).toBe('Dublin');
    expect(loadDiaryWeather).not.toHaveBeenCalled();
  });

  it('a day gone by carries no draft and asks for none', async () => {
    repos.jobs.recent.mockClear();
    const card = await loadDayCard(ann, '2026-10-10');
    expect(card.day.draft).toBeNull();
    expect(repos.jobs.recent).not.toHaveBeenCalled();
  });
});

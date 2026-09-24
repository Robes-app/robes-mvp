import { describe, expect, it, vi } from 'vitest';
import { conditionWord, createWeather, parseForecast, parseGeocode } from './weather';

const geo = { results: [{ name: 'Dublin', latitude: 53.35, longitude: -6.26 }] };
const forecast = {
  daily: { temperature_2m_max: [16.6], temperature_2m_min: [10.8], weather_code: [61] },
};
const place = { city: 'Dublin', lat: null, lon: null, date: '2026-09-24', month: 'September' };

describe('weather', () => {
  it('parses Open-Meteo fixtures', () => {
    expect(parseGeocode(geo)).toEqual({ lat: 53.35, lon: -6.26, name: 'Dublin' });
    expect(parseGeocode({ results: [] })).toBeNull();
    expect(parseForecast(forecast)).toEqual({ tempRange: '11–17°C', condition: 'light rain' });
    expect(parseForecast({})).toBeNull();
    expect(conditionWord(0)).toBe('clear');
    expect(conditionWord(95)).toBe('thunderstorms');
  });

  it('geocodes her city, caches per day, and never throws', async () => {
    const fetchFn = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('geocoding') ? geo : forecast),
    }));
    const weatherFor = createWeather(fetchFn);
    expect(await weatherFor(place)).toEqual({
      city: 'Dublin',
      month: 'September',
      tempRange: '11–17°C',
      condition: 'light rain',
    });
    await weatherFor(place);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const down = createWeather(async () => {
      throw new Error('offline');
    });
    expect(await down(place)).toBeNull();
    expect(await down({ ...place, city: null })).toBeNull();
  });

  it('uses stored coordinates without geocoding', async () => {
    const fetchFn = vi.fn(async (_url: string) => ({ ok: true, json: async () => forecast }));
    await createWeather(fetchFn)({ ...place, lat: 53.3, lon: -6.2 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('api.open-meteo.com');
  });
});

describe('trip weather', () => {
  const geoLisbon = {
    results: [{ name: 'Lisbon', country: 'Portugal', latitude: 38.7, longitude: -9.1 }],
  };
  const range = {
    daily: {
      temperature_2m_max: [24.2, 26.8, 25.1],
      temperature_2m_min: [15.1, 16.4, 14.6],
      weather_code: [0, 1, 0],
    },
  };
  const trip = { destination: 'Lisbon', dateFrom: '2026-10-02', dateTo: '2026-10-04' };

  it('parses a window into a range and the dominant condition', async () => {
    const { parseRange } = await import('./weather');
    expect(parseRange(range)).toEqual({
      minC: 15,
      maxC: 27,
      tempRange: '15–27°C',
      condition: 'clear',
    });
    expect(parseRange({ daily: {} })).toBeNull();
  });

  it('uses the live forecast inside 16 days, last year’s dates beyond it', async () => {
    const { createTripWeather } = await import('./weather');
    const fetchFn = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('geocoding') ? geoLisbon : range),
    }));
    const soon = await createTripWeather(fetchFn)({
      ...trip,
      now: new Date('2026-09-24T00:00:00Z'),
    });
    expect(soon).toMatchObject({
      city: 'Lisbon',
      country: 'Portugal',
      tempRange: '15–27°C',
      seasonal: false,
    });
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain('api.open-meteo.com/v1/forecast');

    fetchFn.mockClear();
    const later = await createTripWeather(fetchFn)({
      ...trip,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    expect(later?.seasonal).toBe(true);
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain('archive-api.open-meteo.com');
    expect(String(fetchFn.mock.calls[1]?.[0])).toContain('start_date=2025-10-02');
  });

  it('falls back to the other source, keeps the place when both fail, and never throws', async () => {
    const { createTripWeather } = await import('./weather');
    const partial = await createTripWeather(async (url: string) => ({
      ok: !url.includes('open-meteo.com/v1/forecast') && !url.includes('archive'),
      json: async () => geoLisbon,
    }))({ ...trip, now: new Date('2026-09-24T00:00:00Z') });
    expect(partial).toMatchObject({ city: 'Lisbon', tempRange: null });
    const down = await createTripWeather(async () => {
      throw new Error('offline');
    })(trip);
    expect(down).toBeNull();
  });
});

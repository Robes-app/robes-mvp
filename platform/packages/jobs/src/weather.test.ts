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

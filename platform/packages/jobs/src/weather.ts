import type { Weather } from '@robes/ai/prompts/daily';

// Today's weather for the daily prompt (Open-Meteo, no key). Fixed hosts only; every failure is
// null so the job never waits on weather.
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 3_000;

// WMO weather codes → a plain word (open-meteo.com/en/docs).
export function conditionWord(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return code <= 61 || code === 80 ? 'light rain' : 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunderstorms';
  return 'mixed';
}

export function parseGeocode(json: unknown): { lat: number; lon: number; name: string } | null {
  const r = (json as { results?: { latitude?: unknown; longitude?: unknown; name?: unknown }[] })
    ?.results?.[0];
  if (!r || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return null;
  return { lat: r.latitude, lon: r.longitude, name: typeof r.name === 'string' ? r.name : '' };
}

export function parseForecast(json: unknown): { tempRange: string; condition: string } | null {
  const d = (json as { daily?: Record<string, unknown[]> })?.daily;
  const max = d?.temperature_2m_max?.[0];
  const min = d?.temperature_2m_min?.[0];
  const code = d?.weather_code?.[0];
  if (typeof max !== 'number' || typeof min !== 'number') return null;
  return {
    tempRange: `${Math.round(min)}–${Math.round(max)}°C`,
    condition: typeof code === 'number' ? conditionWord(code) : '',
  };
}

type Fetch = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export function createWeather(fetchFn: Fetch = fetch as unknown as Fetch) {
  const cache = new Map<string, Weather | null>();
  const get = async (url: string) => {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error('weather request failed');
    return res.json();
  };
  return async function weatherFor(place: {
    city: string | null;
    lat: number | null;
    lon: number | null;
    date: string;
    month: string;
  }): Promise<Weather | null> {
    if (!place.city && (place.lat === null || place.lon === null)) return null;
    const key = `${place.lat ?? ''},${place.lon ?? ''},${place.city ?? ''}|${place.date}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    let result: Weather | null = null;
    try {
      let coords =
        place.lat !== null && place.lon !== null ? { lat: place.lat, lon: place.lon } : null;
      if (!coords && place.city) {
        const geo = parseGeocode(
          await get(`${GEOCODE}?name=${encodeURIComponent(place.city)}&count=1`),
        );
        coords = geo;
      }
      if (coords) {
        const f = parseForecast(
          await get(
            `${FORECAST}?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1`,
          ),
        );
        if (f) result = { city: place.city, month: place.month, ...f };
      }
    } catch {
      result = null;
    }
    if (cache.size > 500) cache.clear();
    cache.set(key, result);
    return result;
  };
}
export type WeatherFor = ReturnType<typeof createWeather>;

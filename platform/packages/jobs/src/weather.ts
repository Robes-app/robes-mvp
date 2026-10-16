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

export interface DayForecast {
  city: string | null;
  tempRange: string;
  condition: string;
  tmax: number;
  code: number | null;
}

// One day's forecast (a dated ask, legacy __rbWxForDate): null past the forecast's reach or on
// any failure, so the looks are styled for the season instead.
export function createDayForecast(fetchFn: Fetch = fetch as unknown as Fetch) {
  const get = async (url: string) => {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error('weather request failed');
    return res.json();
  };
  return async function forecastFor(place: {
    city: string | null;
    lat: number | null;
    lon: number | null;
    date: string;
  }): Promise<DayForecast | null> {
    try {
      let coords =
        place.lat !== null && place.lon !== null ? { lat: place.lat, lon: place.lon } : null;
      if (!coords && place.city) {
        coords = parseGeocode(
          await get(`${GEOCODE}?name=${encodeURIComponent(place.city)}&count=1`),
        );
      }
      if (!coords) return null;
      const json = await get(
        `${FORECAST}?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&start_date=${place.date}&end_date=${place.date}`,
      );
      const f = parseForecast(json);
      const d = (json as { daily?: Record<string, unknown[]> })?.daily;
      const max = d?.temperature_2m_max?.[0];
      const code = d?.weather_code?.[0];
      if (!f || typeof max !== 'number') return null;
      return {
        city: place.city,
        ...f,
        tmax: Math.round(max),
        code: typeof code === 'number' ? code : null,
      };
    } catch {
      return null;
    }
  };
}
export type DayForecastFor = ReturnType<typeof createDayForecast>;

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

// A window of daily readings → min/max and the most frequent condition (legacy fetchTripWeather).
export function parseRange(json: unknown): {
  minC: number;
  maxC: number;
  tempRange: string;
  condition: string;
} | null {
  const d = (json as { daily?: Record<string, unknown[]> })?.daily;
  const nums = (xs: unknown[] | undefined) =>
    (xs ?? []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const maxes = nums(d?.temperature_2m_max);
  const mins = nums(d?.temperature_2m_min);
  if (!maxes.length || !mins.length) return null;
  const counts = new Map<number, number>();
  for (const c of nums(d?.weather_code)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const minC = Math.round(Math.min(...mins));
  const maxC = Math.round(Math.max(...maxes));
  return {
    minC,
    maxC,
    tempRange: `${minC}–${maxC}°C`,
    condition: dominant === undefined ? '' : conditionWord(dominant),
  };
}

const shiftYear = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

export interface TripWeatherResult {
  city: string;
  country: string;
  minC: number | null;
  maxC: number | null;
  tempRange: string | null;
  condition: string | null;
  // True when read from last year's same dates rather than a live forecast.
  seasonal: boolean;
}

// Trip weather: the live forecast when the trip starts within Open-Meteo's 16-day horizon, else last
// year's same dates as a seasonal read; each falls back to the other. Never throws.
export function createTripWeather(fetchFn: Fetch = fetch as unknown as Fetch) {
  const cache = new Map<string, TripWeatherResult | null>();
  const get = async (url: string) => {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS * 2) });
    if (!res.ok) throw new Error('weather request failed');
    return res.json();
  };
  return async function tripWeather(trip: {
    destination: string;
    dateFrom: string;
    dateTo: string;
    now?: Date;
  }): Promise<TripWeatherResult | null> {
    const key = `${trip.destination.toLowerCase()}|${trip.dateFrom}|${trip.dateTo}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    let result: TripWeatherResult | null = null;
    try {
      const geoJson = (await get(
        `${GEOCODE}?name=${encodeURIComponent(trip.destination)}&count=1&language=en`,
      )) as { results?: { country?: unknown }[] };
      const geo = parseGeocode(geoJson);
      if (geo) {
        const country = geoJson.results?.[0]?.country;
        const base = {
          city: geo.name || trip.destination,
          country: typeof country === 'string' ? country : '',
          minC: null,
          maxC: null,
          tempRange: null,
          condition: null,
          seasonal: false,
        };
        const daily = 'temperature_2m_max,temperature_2m_min,weather_code';
        const live = `${FORECAST}?latitude=${geo.lat}&longitude=${geo.lon}&daily=${daily}&start_date=${trip.dateFrom}&end_date=${trip.dateTo}&timezone=auto`;
        const archive = `${ARCHIVE}?latitude=${geo.lat}&longitude=${geo.lon}&daily=${daily}&start_date=${shiftYear(trip.dateFrom)}&end_date=${shiftYear(trip.dateTo)}`;
        const now = trip.now ?? new Date();
        const daysToStart = Math.round(
          (new Date(`${trip.dateFrom}T00:00:00Z`).getTime() - now.getTime()) / 86_400_000,
        );
        const useLive = daysToStart >= -1 && daysToStart <= 16;
        const plan = useLive
          ? [
              { url: live, seasonal: false },
              { url: archive, seasonal: true },
            ]
          : [
              { url: archive, seasonal: true },
              { url: live, seasonal: false },
            ];
        result = base;
        for (const step of plan) {
          let range: ReturnType<typeof parseRange> = null;
          try {
            range = parseRange(await get(step.url));
          } catch {
            range = null;
          }
          if (range) {
            result = { ...base, ...range, seasonal: step.seasonal };
            break;
          }
        }
      }
    } catch {
      result = null;
    }
    if (cache.size > 500) cache.clear();
    cache.set(key, result);
    return result;
  };
}
export type TripWeatherFor = ReturnType<typeof createTripWeather>;

// One reading of a WMO weather code (open-meteo.com/en/docs) for every surface: the plain word the
// prompts and the weather line carry, and the line icon that leads the line (never an emoji; beta's
// _rbWxSvg). Icon names match @robes/icons.
export type WeatherIcon = 'sun' | 'partCloud' | 'cloud' | 'fog' | 'rain' | 'snow' | 'thunder';

export function weatherCondition(code: number): string {
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

export function weatherIcon(code: number | null | undefined): WeatherIcon | null {
  if (typeof code !== 'number' || !Number.isFinite(code)) return null;
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'partCloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloud';
}

// How long a client keeps the weather line before asking again: the server holds the live reading
// as long (LIVE_TTL_MS in @robes/jobs), so the temperature now is at most half an hour old.
export const WEATHER_STALE_MS = 15 * 60_000;

// The weather line's reading (GET /today/weather): today it is live — the temperature and the
// conditions now; a day ahead it is that day's range and conditions. An older server sends neither
// live field, so the range and the day's word stand in.
export interface WeatherReading {
  tempRange: string;
  condition: string;
  nowC?: number | null;
  code?: number | null;
}

export function weatherTemp(w: WeatherReading): string {
  return typeof w.nowC === 'number' && Number.isFinite(w.nowC) ? `${w.nowC}°C` : w.tempRange;
}

export function weatherWord(w: WeatherReading): string {
  return typeof w.code === 'number' && Number.isFinite(w.code)
    ? weatherCondition(w.code)
    : w.condition;
}

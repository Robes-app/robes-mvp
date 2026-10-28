import { describe, expect, it } from 'vitest';
import { weatherCondition, weatherIcon, weatherTemp, weatherWord } from './index';

describe('weather codes', () => {
  it('reads a WMO code as one word', () => {
    expect(weatherCondition(0)).toBe('clear');
    expect(weatherCondition(2)).toBe('partly cloudy');
    expect(weatherCondition(3)).toBe('overcast');
    expect(weatherCondition(48)).toBe('fog');
    expect(weatherCondition(53)).toBe('drizzle');
    expect(weatherCondition(61)).toBe('light rain');
    expect(weatherCondition(65)).toBe('rain');
    expect(weatherCondition(75)).toBe('snow');
    expect(weatherCondition(99)).toBe('thunderstorms');
  });

  it('leads with a line icon for the conditions, and none without a code', () => {
    const table: [number, string][] = [
      [0, 'sun'],
      [1, 'partCloud'],
      [2, 'partCloud'],
      [3, 'cloud'],
      [45, 'fog'],
      [48, 'fog'],
      [51, 'rain'],
      [57, 'rain'],
      [61, 'rain'],
      [67, 'rain'],
      [80, 'rain'],
      [82, 'rain'],
      [71, 'snow'],
      [77, 'snow'],
      [85, 'snow'],
      [86, 'snow'],
      [95, 'thunder'],
      [99, 'thunder'],
      [42, 'cloud'],
    ];
    for (const [code, icon] of table) expect(weatherIcon(code)).toBe(icon);
    expect(weatherIcon(null)).toBeNull();
    expect(weatherIcon(undefined)).toBeNull();
    expect(weatherIcon(Number.NaN)).toBeNull();
  });
});

describe('weather reading', () => {
  const day = { tempRange: '11–15°C', condition: 'clear' };

  it('is live today: the temperature and conditions now', () => {
    expect(weatherTemp({ ...day, nowC: 13, code: 3 })).toBe('13°C');
    expect(weatherWord({ ...day, nowC: 13, code: 3 })).toBe('overcast');
    expect(weatherTemp({ ...day, nowC: -2, code: 3 })).toBe('-2°C');
  });

  it('falls back to the day’s range and word without a live reading', () => {
    expect(weatherTemp({ ...day, nowC: null, code: null })).toBe('11–15°C');
    expect(weatherTemp(day)).toBe('11–15°C');
    expect(weatherWord(day)).toBe('clear');
  });
});

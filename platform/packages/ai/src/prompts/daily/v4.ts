import {
  PLACE_RULE,
  type PlaceRead,
  type PlaceWeather,
  placeBlock,
  placeWeatherLine,
} from '@robes/core/landscape';
import { buildUser as buildUserV1, type DailyContext, type Weather } from './v1';
import { buildSystem as buildSystemV3 } from './v3';

// v4 (Liberty's Landscape-Aware Styling, 28 Oct; the style-piece v5 twin): the weather follows the
// place she names, and a landscape she names is a practical input — never a style.
export * from './v3';
export const VERSION = 4;

export interface DailyPlace {
  read: PlaceRead;
  there: PlaceWeather | null;
}

export function buildSystem(
  ctx: DailyContext,
  place: Pick<PlaceRead, 'landscapes' | 'activity'> | null = null,
): string {
  const s = buildSystemV3(ctx);
  const at = s.indexOf('\n\nWARDROBE STATE:');
  if (at < 0) throw new Error('daily v4: expected the wardrobe state');
  const block = place ? placeBlock(place) : '';
  return `${s.slice(0, at)}\n\n${PLACE_RULE}${block ? `\n\n${block}` : ''}${s.slice(at)}`;
}

const placed = (p: DailyPlace | null | undefined) =>
  Boolean(p && (p.there || p.read.landscapes.length || (p.read.named && p.read.destination)));

// Her own weather, as v1 says it, unless her words put the day somewhere else.
export function buildUser(
  brief: string | undefined,
  weather: Weather | null,
  place: DailyPlace | null = null,
  month: string | null = null,
): string {
  if (!place || !placed(place)) return buildUserV1(brief, weather);
  const { line } = placeWeatherLine({
    dayLabel: null,
    month: weather?.month ?? month,
    home: {
      city: weather?.city ?? null,
      tempRange: weather?.tempRange ?? null,
      condition: weather?.condition ?? null,
    },
    read: place.read,
    there: place.there,
  });
  const rest = buildUserV1(brief, null);
  return line ? `${line}\n\n${rest}` : rest;
}

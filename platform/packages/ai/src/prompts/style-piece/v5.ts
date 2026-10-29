import {
  PLACE_RULE,
  type PlaceRead,
  type PlaceWeather,
  placeBlock,
  placeWeatherLine,
} from '@robes/core/landscape';
import {
  buildSystem as buildSystemV4,
  buildUser as buildUserV4,
  dayLine,
  type Mode,
  type Refine,
  type Steer,
  type StyleContext,
  type DayContext as V4DayContext,
} from './v4';

// v5 (Liberty's Landscape-Aware Styling, 28 Oct; legacy beta the same day): the weather follows the
// place she names, not the city she is in ("a weekend in the Alps" typed in London was dressed for
// London rain and told London was the place). A landscape she names is a practical input — fabric,
// footwear, layers — never a style; THE PLACE renders Liberty's notes for it, from the vocabulary in
// @robes/core/landscape, never her words.
export * from './v4';
export const VERSION = 5;

export interface DayPlace {
  read: PlaceRead;
  // The destination's weather when the geocoder confirmed it; null otherwise.
  there: PlaceWeather | null;
}

export interface DayContext extends V4DayContext {
  place?: DayPlace | null;
}

export type Ask =
  | {
      mode: 'piece';
      anchor:
        | { type: 'piece'; label: string; wearFor?: readonly string[] }
        | { type: 'text'; text: string };
    }
  | { mode: 'dress-me'; prompt: string; day: DayContext | null };

// v4's text is frozen; v5 changes it in exactly these places, each of which must exist once.
function swap(text: string, from: string, to: string): string {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + from.length) >= 0) {
    throw new Error(`style-piece v5: expected one "${from.slice(0, 40)}"`);
  }
  return text.slice(0, at) + to + text.slice(at + from.length);
}

export const ANCHOR_V5 =
  'THE ANCHOR, the hero piece for the weather, the place and what she does there';
export const SCENE_PLACE =
  'The setting is the place she names, as it really is in that season, never its postcard.';

export function buildSystem(
  ctx: StyleContext,
  mode: Mode,
  steer: Steer = {},
  place: Pick<PlaceRead, 'landscapes' | 'activity'> | null = null,
): string {
  let s = buildSystemV4(ctx, mode, steer);
  s = swap(s, 'THE ANCHOR, the hero piece for the weather and agenda', ANCHOR_V5);
  s = swap(
    s,
    'A trick that needs explaining is dropped.',
    `A trick that needs explaining is dropped. ${PLACE_RULE}`,
  );
  s = swap(
    s,
    '"paired with a pencil skirt and loafers" is forbidden.',
    `"paired with a pencil skirt and loafers" is forbidden. ${SCENE_PLACE}`,
  );
  const block = place ? placeBlock(place) : '';
  if (block) s = swap(s, '\n\nTHE FORMULA —', `\n\n${block}\n\nTHE FORMULA —`);
  return s;
}

// The weather line for a dress-me ask: the place she names, or her own, as before.
export function placeLine(day: DayContext | null): ReturnType<typeof placeWeatherLine> | null {
  if (!day) return null;
  return placeWeatherLine({
    dayLabel: day.dayLabel,
    month: day.month,
    home: { city: day.city, tempRange: day.tempRange, condition: day.condition },
    read: day.place?.read ?? { landscapes: [], activity: null, destination: null, named: false },
    there: day.place?.there ?? null,
  });
}

export function buildUser(ask: Ask, opts: { hasPhoto: boolean; refine?: Refine | null }): string {
  const out = buildUserV4(ask, opts);
  if (ask.mode !== 'dress-me') return out;
  const old = dayLine(ask.day);
  const line = placeLine(ask.day)?.line ?? '';
  if (old === line) return out;
  if (!old) return line ? `${line}\n\n${out}` : out;
  return line ? swap(out, old, line) : swap(out, `${old}\n\n`, '');
}

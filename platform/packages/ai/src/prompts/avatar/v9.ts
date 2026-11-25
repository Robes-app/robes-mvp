import type { TwinSpec } from '@robes/core/avatar';
import {
  twinDescriptor as v3Descriptor,
  twinFigureLine as v3FigureLine,
  buildTwinPrompt as v3TwinPrompt,
} from './v3';

// v9 (The facts redesign, 24 Nov): his third scale is his waist, not his hips. His figure line
// names his waist from that scale and leaves out the hips and the bust−waist definition, which
// were written for her; hers is v8's word for word, so no woman's twin is drawn again.
export * from './v8';
export const VERSION = 9;

type Words = Partial<Record<'-2' | '-1' | '1' | '2', string>>;
const WAIST: Words = {
  '-2': 'a very trim, narrow waist',
  '-1': 'a trim waist',
  '1': 'a fuller waist',
  '2': 'a full, rounded midsection',
};

export function twinFigureLine(s: TwinSpec): string {
  if (s.gender !== 'man') return v3FigureLine(s);
  // v3's line with the hips and waist definition at their neutral reading, so neither is said.
  const base = v3FigureLine({ ...s, stops: { ...s.stops, hips: 0 }, waistDiff: null });
  const waist = WAIST[String(s.stops.waist) as keyof Words];
  return waist ? `${base.slice(0, -1)}, ${waist}.` : base;
}

export function twinDescriptor(s: TwinSpec): string {
  return v3Descriptor(s, twinFigureLine);
}

export function buildTwinPrompt(s: TwinSpec): string {
  return v3TwinPrompt(s, twinFigureLine);
}

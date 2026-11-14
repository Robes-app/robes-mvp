import { z } from 'zod';
import * as v8 from './v8';

// v9 (look prompt PRD D6, F3, F4, 14 Nov): her words make ONE look, so the prompt asks for one
// way instead of three it would throw two of away; and Robes names the occasion in her brief in
// a word or two, for its one question ("How does this feel for brunch?"). The piece door still
// deals three ways, and its system text is v8's byte for byte.
export * from './v8';
export const VERSION = 9;

export const Output = v8.Output.extend({ occasion: z.string().max(80).optional() });
export type Output = z.infer<typeof Output>;

const ONE_WAY =
  'ONE WAY ONLY — this ask is for a single look. Everything above about three ways and how they differ from each other no longer applies: write exactly ONE entry in "ways", the best complete look for her brief.';
const OCCASION =
  'THE OCCASION — also return "occasion": what her brief is for, in one or two plain lowercase words exactly as they would follow the word "for" ("brunch", "the office", "a wedding", "date night"). No punctuation. When her brief names no occasion, return "".';

export function buildSystem(
  ctx: Parameters<typeof v8.buildSystem>[0],
  mode: Parameters<typeof v8.buildSystem>[1],
  steer: Parameters<typeof v8.buildSystem>[2] = {},
  place: Parameters<typeof v8.buildSystem>[3] = null,
  // Her words for a look (the prompt box): one way, and the occasion named.
  opts: { one?: boolean } = {},
): string {
  const s = v8.buildSystem(ctx, mode, steer, place);
  return opts.one ? `${s}\n\n${ONE_WAY}\n\n${OCCASION}` : s;
}

const OCCASION_WORDS = 3;
const OCCASION_CHARS = 24;

// The occasion as it may stand in Robes' question: one to three plain words, or '' — a phrase,
// a sentence or anything with punctuation falls back to the plain question (F4).
export function occasionOf(out: Pick<Output, 'occasion'>): string {
  const said = String(out.occasion ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!said || said.length > OCCASION_CHARS) return '';
  if (!/^[\p{L}][\p{L}' -]*$/u.test(said)) return '';
  return said.split(' ').length <= OCCASION_WORDS ? said : '';
}

// Offline fixture: one way and a plain occasion for her words, v8's three for a piece.
export function fakeOutput(opts: Parameters<typeof v8.fakeOutput>[0] & { one?: boolean }): Output {
  const out = v8.fakeOutput(opts);
  return opts.one ? { ...out, ways: out.ways.slice(0, 1), occasion: 'dinner' } : out;
}

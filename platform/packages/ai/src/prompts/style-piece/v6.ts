import { buildUser as buildUserV5, type DayContext, type Ask as V5Ask } from './v5';

// v6 (Front Door design 3k, plan 2026-11-02): the prompt box's hanger. She chooses pieces of hers
// to build the day around, and every look holds all of them, by exact label; the rest is dressed
// around them. Nothing else changes: the system text and a prompt without pieces are v5's.
export * from './v5';
export const VERSION = 6;

export interface AroundPiece {
  label: string;
  wearFor?: readonly string[];
}

export type Ask =
  | Exclude<V5Ask, { mode: 'dress-me' }>
  | { mode: 'dress-me'; prompt: string; day: DayContext | null; around?: readonly AroundPiece[] };

export const AROUND_LEAD =
  'BUILD AROUND — she chose these pieces of hers for the day. Every look holds all of them, each by its exact label from her wardrobe, and the rest of the look is dressed around them:';

export function aroundBlock(around: readonly AroundPiece[]): string {
  const names = around.map((p) => p.label.trim()).filter(Boolean);
  if (names.length === 0) return '';
  return `${AROUND_LEAD} ${names.join('; ')}.`;
}

export function buildUser(
  ask: Ask,
  opts: { hasPhoto: boolean; refine?: import('./v4').Refine | null },
): string {
  if (ask.mode !== 'dress-me') return buildUserV5(ask, opts);
  const { around, ...plain } = ask;
  const out = buildUserV5(plain, opts);
  const block = around ? aroundBlock(around) : '';
  return block ? `${out}\n\n${block}` : out;
}

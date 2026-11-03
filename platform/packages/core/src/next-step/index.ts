// Today's one next step (legacy `_rbNextLine`, legacy-features.md §1.3): ordered rules, first match
// wins. Not ported yet: `finish` (needs look proposals).
import type { Presence } from '../avatar';
export type NextStepRule = 'start' | 'model' | 'five' | 'build' | 'wear' | 'week';

export interface NextStepState {
  readyPieces: number;
  looks: number;
  // A look is pinned to her today and she hasn't recorded wearing it.
  todayPinnedUnworn: boolean;
  // Any look pinned in the next seven days (today included).
  weekPlanned: boolean;
  // She has filed a model; her newest saved look's name for the `model` line.
  hasModel?: boolean;
  newestLook?: string | null;
  presence?: Presence;
}

export type NextStep = {
  rule: NextStepRule;
  remaining?: number;
  // `build`: how many photographed pieces she has, so the line never reads "Five" at fifty.
  count?: number;
  lookName?: string;
  presence?: Presence;
} | null;

export const PIECES_TO_BUILD = 5;
// The top of the 5/10/15 ladder: the first-build offer and the wardrobe tracker retire here.
export const PIECES_LADDER_TOP = 15;

export function nextStep(s: NextStepState): NextStep {
  if (s.readyPieces === 0 && s.looks === 0) return { rule: 'start' };
  // Legacy order: the model line outranks the five-piece ladder.
  if (s.hasModel === false && s.looks > 0 && s.newestLook) {
    return { rule: 'model', lookName: s.newestLook, presence: s.presence ?? 'woman' };
  }
  if (s.looks > 0 && s.readyPieces < PIECES_TO_BUILD) {
    return { rule: 'five', remaining: PIECES_TO_BUILD - s.readyPieces };
  }
  // A first-time offer (legacy b3de655): it stands down at the top of the ladder.
  if (s.readyPieces >= PIECES_TO_BUILD && s.readyPieces < PIECES_LADDER_TOP && s.looks === 0) {
    return { rule: 'build', count: s.readyPieces };
  }
  if (s.todayPinnedUnworn) return { rule: 'wear' };
  if (s.looks > 0 && !s.weekPlanned) return { rule: 'week' };
  return null;
}

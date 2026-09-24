// Today's one next step (legacy `_rbNextLine`, legacy-features.md §1.3): ordered rules, first match
// wins. Not ported yet: `model` (needs the avatar model) and `finish` (needs look proposals).
export type NextStepRule = 'start' | 'five' | 'build' | 'wear' | 'week';

export interface NextStepState {
  readyPieces: number;
  looks: number;
  // A look is pinned to her today and she hasn't recorded wearing it.
  todayPinnedUnworn: boolean;
  // Any look pinned in the next seven days (today included).
  weekPlanned: boolean;
}

export type NextStep = { rule: NextStepRule; remaining?: number } | null;

export const PIECES_TO_BUILD = 5;

export function nextStep(s: NextStepState): NextStep {
  if (s.readyPieces === 0 && s.looks === 0) return { rule: 'start' };
  if (s.looks > 0 && s.readyPieces < PIECES_TO_BUILD) {
    return { rule: 'five', remaining: PIECES_TO_BUILD - s.readyPieces };
  }
  if (s.readyPieces >= PIECES_TO_BUILD && s.looks === 0) return { rule: 'build' };
  if (s.todayPinnedUnworn) return { rule: 'wear' };
  if (s.looks > 0 && !s.weekPlanned) return { rule: 'week' };
  return null;
}

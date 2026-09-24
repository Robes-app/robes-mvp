import { describe, expect, it } from 'vitest';
import { type NextStepState, nextStep } from './index';

const s = (over: Partial<NextStepState> = {}): NextStepState => ({
  readyPieces: 0,
  looks: 0,
  todayPinnedUnworn: false,
  weekPlanned: false,
  ...over,
});

describe('nextStep (legacy _rbNextLine order)', () => {
  it('starts an empty wardrobe', () => expect(nextStep(s())).toEqual({ rule: 'start' }));

  it('counts down to five pieces once she has a look', () => {
    expect(nextStep(s({ looks: 1, readyPieces: 3 }))).toEqual({ rule: 'five', remaining: 2 });
  });

  it('offers a first build at five pieces and no looks', () => {
    expect(nextStep(s({ readyPieces: 5 }))).toEqual({ rule: 'build' });
    expect(nextStep(s({ readyPieces: 2 }))).toBeNull();
  });

  it('then asks her to wear today, then to plan the week, first match wins', () => {
    const settled = { readyPieces: 8, looks: 3 };
    expect(nextStep(s({ ...settled, todayPinnedUnworn: true }))).toEqual({ rule: 'wear' });
    expect(nextStep(s({ ...settled }))).toEqual({ rule: 'week' });
    expect(nextStep(s({ ...settled, weekPlanned: true }))).toBeNull();
    // five outranks wear, as in legacy.
    expect(nextStep(s({ looks: 1, readyPieces: 1, todayPinnedUnworn: true }))?.rule).toBe('five');
  });
});

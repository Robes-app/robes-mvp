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
    expect(nextStep(s({ readyPieces: 5 }))).toEqual({ rule: 'build', count: 5 });
    expect(nextStep(s({ readyPieces: 7 }))).toEqual({ rule: 'build', count: 7 });
    expect(nextStep(s({ readyPieces: 2 }))).toBeNull();
  });

  it('stands the first-build offer down at the top of the ladder (legacy b3de655)', () => {
    expect(nextStep(s({ readyPieces: 14 }))).toEqual({ rule: 'build', count: 14 });
    expect(nextStep(s({ readyPieces: 15 }))).toBeNull();
    expect(nextStep(s({ readyPieces: 50 }))).toBeNull();
  });

  it('then asks her to wear today, then to plan the week, first match wins', () => {
    const settled = { readyPieces: 8, looks: 3 };
    expect(nextStep(s({ ...settled, todayPinnedUnworn: true }))).toEqual({ rule: 'wear' });
    expect(nextStep(s({ ...settled }))).toEqual({ rule: 'week' });
    expect(nextStep(s({ ...settled, weekPlanned: true }))).toBeNull();
    // five outranks wear, as in legacy.
    expect(nextStep(s({ looks: 1, readyPieces: 1, todayPinnedUnworn: true }))?.rule).toBe('five');
  });

  it('asks her to build her model before the ladder once she has a look (legacy order)', () => {
    const noModel = { looks: 2, readyPieces: 1, hasModel: false, newestLook: 'Gallery opening' };
    expect(nextStep(s(noModel))).toEqual({
      rule: 'model',
      lookName: 'Gallery opening',
      presence: 'woman',
    });
    expect(nextStep(s({ ...noModel, presence: 'man' }))?.presence).toBe('man');
    expect(nextStep(s({ ...noModel, hasModel: true }))?.rule).toBe('five');
    // Unknown model state (older callers) never shows the line.
    expect(nextStep(s({ looks: 2, readyPieces: 1 }))?.rule).toBe('five');
  });
});

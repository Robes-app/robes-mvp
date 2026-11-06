import { describe, expect, it } from 'vitest';
import {
  canRemoveCard,
  EMPTY_STAGE,
  type StackBase,
  stageAdd,
  stageCards,
  stageChanged,
  stageFront,
  stageInFront,
  stageRemove,
} from './images';

const base: StackBase = {
  robes: true,
  robesHidden: false,
  photos: ['p1'],
  cover: { kind: 'robes' },
};

describe('the image stage (D19, D20)', () => {
  it('lists Robes’ picture, her photographs, then what she added', () => {
    const stage = stageAdd(EMPTY_STAGE, 'a1');
    expect(stageCards(base, stage)).toEqual([
      { kind: 'robes' },
      { kind: 'photo', id: 'p1' },
      { kind: 'added', assetId: 'a1' },
    ]);
  });

  it('puts a new photograph in front, and that is a change to apply', () => {
    expect(stageChanged(base, EMPTY_STAGE)).toBe(false);
    const stage = stageAdd(EMPTY_STAGE, 'a1');
    expect(stageFront(base, stage)).toEqual({ kind: 'added', assetId: 'a1' });
    expect(stageChanged(base, stage)).toBe(true);
  });

  it('hides Robes’ picture instead of removing it', () => {
    const stage = stageRemove(base, EMPTY_STAGE, { kind: 'robes' });
    expect(stage.robesHidden).toBe(true);
    expect(stageCards(base, stage)).toEqual([{ kind: 'photo', id: 'p1' }]);
    // The cover was Robes' picture: the next card leads.
    expect(stageFront(base, stage)).toEqual({ kind: 'photo', id: 'p1' });
  });

  it('never removes the last card', () => {
    const one = stageRemove(base, EMPTY_STAGE, { kind: 'robes' });
    expect(canRemoveCard(base, one)).toBe(false);
    expect(stageRemove(base, one, { kind: 'photo', id: 'p1' })).toBe(one);
  });

  it('takes an added photograph back out without a trace', () => {
    const added = stageAdd(EMPTY_STAGE, 'a1');
    const gone = stageRemove(base, added, { kind: 'added', assetId: 'a1' });
    expect(gone.added).toEqual([]);
    expect(gone.front).toBeNull();
    expect(stageChanged(base, gone)).toBe(false);
  });

  it('keeps the card she left in front as the cover', () => {
    const stage = stageInFront(EMPTY_STAGE, { kind: 'photo', id: 'p1' });
    expect(stageFront(base, stage)).toEqual({ kind: 'photo', id: 'p1' });
    expect(stageChanged(base, stage)).toBe(true);
    expect(stageChanged(base, stageInFront(EMPTY_STAGE, { kind: 'robes' }))).toBe(false);
  });

  it('shows no Robes’ card while she has hidden it', () => {
    const hiddenBase = { ...base, robesHidden: true, cover: { kind: 'photo', id: 'p1' } as const };
    expect(stageCards(hiddenBase, EMPTY_STAGE)).toEqual([{ kind: 'photo', id: 'p1' }]);
    expect(canRemoveCard(hiddenBase, EMPTY_STAGE)).toBe(false);
  });
});

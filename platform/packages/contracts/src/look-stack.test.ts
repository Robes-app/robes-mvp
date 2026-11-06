import { describe, expect, it } from 'vitest';
import { lookStack } from './look-stack';
import type { Look } from './looks';

const img = (id: string) => ({ id, position: 0 }) as unknown as Look['images'][number];
const model = {} as NonNullable<Look['model']>;
const base = { frame: false, model, images: [], record: 'model', robesHidden: false } as Pick<
  Look,
  'frame' | 'model' | 'images' | 'record' | 'robesHidden'
>;

describe('lookStack (D19)', () => {
  it('reads Robes’ picture as the cover until her photograph leads', () => {
    expect(lookStack({ ...base, images: [img('p1')] })).toEqual({
      robes: true,
      robesHidden: false,
      photos: ['p1'],
      cover: { kind: 'robes' },
    });
    expect(lookStack({ ...base, images: [img('p1')], record: 'photo' }).cover).toEqual({
      kind: 'photo',
      id: 'p1',
    });
  });

  it('puts her photograph in front while Robes’ picture is hidden', () => {
    expect(lookStack({ ...base, images: [img('p1')], robesHidden: true }).cover).toEqual({
      kind: 'photo',
      id: 'p1',
    });
  });

  it('counts a frame as Robes’ picture, and none before Robes draws one', () => {
    expect(lookStack({ ...base, model: null, frame: true }).robes).toBe(true);
    const bare = lookStack({ ...base, model: null, images: [img('p1')] });
    expect(bare.robes).toBe(false);
    expect(bare.cover).toEqual({ kind: 'photo', id: 'p1' });
  });
});

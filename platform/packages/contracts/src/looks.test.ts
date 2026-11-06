import { PICTURE_NOTE_MAX } from '@robes/core/looks';
import { describe, expect, it } from 'vitest';
import { Look, LookRobesInput, RedrawLookInput } from './looks';

const olderServerLook = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'saved',
  name: 'Weekend',
  nameProvisional: false,
  note: null,
  source: 'manual',
  originLookId: null,
  climateBand: 'year_round',
  image: null,
  photo: null,
  model: null,
  record: 'model',
  frame: false,
  framePending: false,
  composedByRobes: false,
  pieces: [],
  proposals: [],
  styling: {},
  edits: {},
  anchor: null,
  setId: null,
  setIndex: null,
  dateHint: null,
  timesWorn: 0,
  lastWornOn: null,
  createdAt: '2026-11-06T10:00:00.000Z',
  updatedAt: '2026-11-06T10:00:00.000Z',
};

describe('look contracts (D19, D21)', () => {
  it('reads a look from a server before the picture note and the hidden picture', () => {
    const look = Look.parse(olderServerLook);
    expect(look.pictureNote).toBeNull();
    expect(look.robesHidden).toBe(false);
  });

  it('carries her picture note verbatim and Robes’ picture hidden', () => {
    const look = Look.parse({
      ...olderServerLook,
      pictureNote: 'Sleeves rolled up',
      robesHidden: true,
    });
    expect(look).toMatchObject({ pictureNote: 'Sleeves rolled up', robesHidden: true });
  });

  it('redraws with no body, or with her note trimmed and capped', () => {
    expect(RedrawLookInput.parse({})).toEqual({});
    expect(RedrawLookInput.parse({ note: '  sleeves rolled up  ' })).toEqual({
      note: 'sleeves rolled up',
    });
    // An empty note clears hers.
    expect(RedrawLookInput.parse({ note: '   ' })).toEqual({ note: '' });
    expect(RedrawLookInput.safeParse({ note: 'x'.repeat(PICTURE_NOTE_MAX) }).success).toBe(true);
    expect(RedrawLookInput.safeParse({ note: 'x'.repeat(PICTURE_NOTE_MAX + 1) }).success).toBe(
      false,
    );
    expect(RedrawLookInput.safeParse({ note: 4 }).success).toBe(false);
    // Nothing about the pieces rides along: unknown fields are stripped.
    expect(RedrawLookInput.parse({ note: 'cuffed', pieces: ['x'] })).toEqual({ note: 'cuffed' });
  });

  it('hides or shows Robes’ picture, nothing else', () => {
    expect(LookRobesInput.parse({ hidden: true })).toEqual({ hidden: true });
    expect(LookRobesInput.safeParse({}).success).toBe(false);
    expect(LookRobesInput.safeParse({ hidden: 'yes' }).success).toBe(false);
  });
});

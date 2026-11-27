import { PICTURE_NOTE_MAX } from '@robes/core/looks';
import { describe, expect, it } from 'vitest';
import { CaptureRead, Look, LookRobesInput, PromptLookInput, RedrawLookInput } from './looks';
import { ReadPiece } from './photo-reads';

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

describe('her other likely pieces on a found row (27 Nov)', () => {
  const read = {
    readId: '11111111-1111-4111-8111-111111111111',
    index: 0,
    cropAssetId: '22222222-2222-4222-8222-222222222222',
  };
  const other = '33333333-3333-4333-8333-333333333333';

  it('reads a found row from an app or a look before the list, and carries it after', () => {
    expect(CaptureRead.parse(read)).toMatchObject({ suggestedPieceId: null, alsoSuggestedIds: [] });
    expect(
      CaptureRead.parse({ ...read, suggestedPieceId: other, alsoSuggestedIds: [other] })
        .alsoSuggestedIds,
    ).toEqual([other]);
    expect(CaptureRead.safeParse({ ...read, alsoSuggestedIds: ['shoes'] }).success).toBe(false);
  });

  it('reads a photo read stored before wardrobe-pieces v5', () => {
    const piece = {
      index: 0,
      label: 'Trainers',
      category: 'Shoes',
      categoryL2: null,
      categoryL3: null,
      color: null,
      brand: null,
      notes: null,
      box: { x: 0, y: 0, w: 1, h: 1 },
      match: null,
      cropAssetId: read.cropAssetId,
    };
    expect(ReadPiece.parse(piece).alsoMatches).toEqual([]);
    expect(ReadPiece.parse({ ...piece, alsoMatches: [other] }).alsoMatches).toEqual([other]);
  });
});

describe('style a piece or a wish (24 Nov)', () => {
  const PIECE = '22222222-2222-4222-8222-222222222222';
  const WISH = '33333333-3333-4333-8333-333333333333';
  it('starts from one piece or one wish, never both', () => {
    const base = { prompt: 'Style my silk cami', draft: true };
    expect(PromptLookInput.safeParse({ ...base, anchorPieceId: PIECE }).success).toBe(true);
    expect(PromptLookInput.safeParse({ ...base, anchorWishId: WISH }).success).toBe(true);
    expect(
      PromptLookInput.safeParse({ ...base, anchorPieceId: PIECE, anchorWishId: WISH }).success,
    ).toBe(false);
  });
});

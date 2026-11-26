import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { filedRackHash, rackHash } = await import('./render-key');

const HERS = '22222222-2222-4222-8222-222222222222';
const COAT = '33333333-3333-4333-8333-333333333333';
const CAPTURE = {
  readId: 'r1',
  index: 0,
  cropAssetId: 'a1',
  material: null,
  suggestedPieceId: null,
};
const jeans = { key: 'p-jeans001', name: 'Straight jeans', brand: '', capture: CAPTURE };
const top = {
  key: 'p-top00001',
  name: 'Striped top',
  brand: '',
  capture: { ...CAPTURE, index: 1 },
};
const before = { pieces: [], notes: {}, pictureNote: null, proposals: [jeans, top] };
const drawn = rackHash(before.pieces, before.notes, null, before.proposals);

// Filing a found piece keeps her picture current (Annie, 26 Nov).
describe('filedRackHash', () => {
  it('a found piece matched to hers keeps the picture, under the hash of the filed rack', () => {
    const after = { pieces: [{ id: HERS }], notes: {}, pictureNote: null, proposals: [top] };
    const hash = filedRackHash(before, after, [{ from: jeans.key, to: HERS }], drawn);
    expect(hash).toBe(rackHash(after.pieces, {}, null, after.proposals));
    expect(hash).not.toBe(drawn);
  });

  it('a found piece taken as a wish keeps the picture too', () => {
    const wish = { key: jeans.key, name: 'Wide-leg jeans', brand: 'Arket', capture: null };
    const after = { pieces: [], notes: {}, pictureNote: null, proposals: [wish, top] };
    const hash = filedRackHash(before, after, [{ from: jeans.key, to: jeans.key }], drawn);
    expect(hash).toBe(rackHash([], {}, null, after.proposals));
  });

  it('every found piece filed at once keeps it', () => {
    const after = {
      pieces: [{ id: HERS }, { id: COAT }],
      notes: {},
      pictureNote: null,
      proposals: [],
    };
    const filed = [
      { from: jeans.key, to: HERS },
      { from: top.key, to: COAT },
    ];
    expect(filedRackHash(before, after, filed, drawn)).toBe(rackHash(after.pieces, {}));
  });

  it('anything else changed with it still asks for a redraw', () => {
    const filed = [{ from: jeans.key, to: HERS }];
    // Another piece added alongside.
    const added = {
      pieces: [{ id: HERS }, { id: COAT }],
      notes: {},
      pictureNote: null,
      proposals: [top],
    };
    expect(filedRackHash(before, added, filed, drawn)).toBeNull();
    // The other found piece removed alongside.
    const removed = { pieces: [{ id: HERS }], notes: {}, pictureNote: null, proposals: [] };
    expect(filedRackHash(before, removed, filed, drawn)).toBeNull();
    // A note on how a piece is worn.
    const noted = {
      pieces: [{ id: HERS }],
      notes: { [top.key]: 'tucked' },
      pictureNote: null,
      proposals: [top],
    };
    expect(filedRackHash(before, noted, filed, drawn)).toBeNull();
  });

  it('a picture drawn for another rack is not made current by filing', () => {
    const after = { pieces: [{ id: HERS }], notes: {}, pictureNote: null, proposals: [top] };
    const old = rackHash([], {}, null, [jeans]);
    expect(filedRackHash(before, after, [{ from: jeans.key, to: HERS }], old)).toBeNull();
  });

  it('ignores a filing the racks do not bear out', () => {
    const after = { pieces: [{ id: HERS }], notes: {}, pictureNote: null, proposals: [top] };
    // Not a found row before.
    expect(filedRackHash(before, after, [{ from: 'p-other001', to: HERS }], drawn)).toBeNull();
    // Her piece was already on the look.
    const had = { ...before, pieces: [{ id: HERS }] };
    const was = rackHash(had.pieces, {}, null, had.proposals);
    expect(filedRackHash(had, after, [{ from: jeans.key, to: HERS }], was)).toBeNull();
    // The found row is still there.
    const still = { pieces: [{ id: HERS }], notes: {}, pictureNote: null, proposals: [jeans, top] };
    expect(filedRackHash(before, still, [{ from: jeans.key, to: HERS }], drawn)).toBeNull();
  });
});

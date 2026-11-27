import { describe, expect, it } from 'vitest';
import {
  captureEyebrow,
  captureImage,
  captureRows,
  captureStage,
  cropReads,
  cropsLanding,
  type FoundPiece,
  filedCount,
  fileRow,
  filesOnly,
  isCaptureRow,
  removeRow,
  restoreRows,
} from './capture';
import type { RackRow } from './index';

const READ = '11111111-1111-4111-8111-111111111111';
const HERS = '22222222-2222-4222-8222-222222222222';
const found = (index: number, over: Partial<FoundPiece> = {}): FoundPiece => ({
  index,
  label: ['Cropped sweatshirt', 'Leggings', 'Running trainers'][index] ?? 'Piece',
  category: ['Tops', 'Bottoms', 'Shoes'][index] ?? 'Other',
  categoryL2: null,
  color: null,
  colourShade: null,
  brand: null,
  material: null,
  cropAssetId: `33333333-3333-4333-8333-33333333333${index}`,
  match: null,
  ...over,
});
const keys = () => {
  let n = 0;
  return () => `p-0000000${n++}`;
};
const hers = (id = HERS): RackRow => ({
  key: id,
  pieceId: id,
  name: 'Lime green sweatshirt',
  category: 'Tops',
  brand: 'Adidas',
  role: null,
  proposal: null,
});

describe('captureRows', () => {
  it('makes one unfiled row per found piece, in the read’s order', () => {
    const rows = captureRows(READ, [found(2), found(0), found(1)], keys());
    expect(rows.map((r) => r.name)).toEqual(['Cropped sweatshirt', 'Leggings', 'Running trainers']);
    expect(rows.every(isCaptureRow)).toBe(true);
    expect(rows[0]?.proposal?.capture).toMatchObject({ readId: READ, index: 0 });
    expect(filedCount(rows)).toBe(0);
  });

  it('suggests her piece only on a close match', () => {
    const [close, far, none] = captureRows(
      READ,
      [
        found(0, { match: { pieceId: HERS, confidence: 0.8 } }),
        found(1, { match: { pieceId: HERS, confidence: 0.2 } }),
        found(2),
      ],
      keys(),
    );
    expect(close?.proposal?.capture?.suggestedPieceId).toBe(HERS);
    expect(far?.proposal?.capture?.suggestedPieceId).toBeNull();
    expect(none?.proposal?.capture?.suggestedPieceId).toBeNull();
  });

  it('reads category, colour and material in the small caps, skipping what was not seen', () => {
    const [full, bare] = captureRows(
      READ,
      [found(0, { colourShade: 'lime', material: 'cotton' }), found(1)],
      keys(),
    );
    expect(captureEyebrow(full as RackRow, 'Tops')).toBe('Tops · Lime · Cotton');
    expect(captureEyebrow(bare as RackRow, 'Bottoms')).toBe('Bottoms');
  });
});

describe('the rack', () => {
  const rows = captureRows(READ, [found(0), found(1), found(2)], keys());
  const [top, bottom, shoes] = rows as [RackRow, RackRow, RackRow];

  it('matching or adding turns a row filed, in place', () => {
    const next = fileRow(rows, top.key, hers());
    expect(next.map((r) => r.key)).toEqual([HERS, bottom.key, shoes.key]);
    expect(filedCount(next)).toBe(1);
  });

  // Filing keeps the picture current (Annie, 26 Nov): the filed row remembers the found row.
  it('a filed row remembers the found row it was, and filing alone is no change to the picture', () => {
    const next = fileRow(rows, top.key, hers());
    expect(next[0]?.filedFrom).toBe(top.key);
    expect(next[1]).toBe(bottom);
    expect(filesOnly(rows, next)).toBe(true);
    expect(filesOnly(next, fileRow(next, bottom.key, hers('x')))).toBe(true);
    // Nothing filed, a row taken off, or a filed row swapped for another piece: a change.
    expect(filesOnly(rows, rows)).toBe(false);
    expect(filesOnly(next, removeRow(next, [], bottom.key).rows)).toBe(false);
    expect(filesOnly(next, [hers('y'), bottom, shoes])).toBe(false);
    // Matched to another piece of hers than the one photographed: a change like any swap.
    const other = fileRow(rows, top.key, hers('z'), false);
    expect(other[0]).toMatchObject({ pieceId: hers('z').pieceId });
    expect(other[0]?.filedFrom).toBeUndefined();
    expect(filesOnly(rows, other)).toBe(false);
  });

  it('a filed row already on the rack is not filed from anything', () => {
    const once = fileRow(rows, top.key, hers());
    const twice = fileRow(once, bottom.key, hers());
    expect(twice.some((r) => r.filedFrom === bottom.key)).toBe(false);
  });

  it('never hangs her piece twice', () => {
    const once = fileRow(rows, top.key, hers());
    const twice = fileRow(once, bottom.key, hers());
    expect(twice.map((r) => r.key)).toEqual([HERS, shoes.key]);
  });

  it('a wish takes a found row as a piece to find, and is never hung twice', () => {
    const wish = (key: string): RackRow => ({
      key,
      pieceId: null,
      name: 'Black leather biker jacket',
      category: 'Outerwear',
      categoryL2: null,
      brand: 'Totême',
      role: null,
      proposal: {
        key,
        name: 'Black leather biker jacket',
        category: 'Outerwear',
        color: '',
        brand: 'Totême',
        retailerHint: '',
        pricePoint: '€1200',
        role: null,
        wishlisted: true,
        wishlistItemId: 'wish-1',
        capture: null,
      },
    });
    const once = fileRow(rows, top.key, wish(top.key));
    expect(once.map((r) => r.proposal?.wishlistItemId ?? null)).toEqual(['wish-1', null, null]);
    expect(once[0]?.filedFrom).toBe(top.key);
    expect(filesOnly(rows, once)).toBe(true);
    expect(isCaptureRow(once[0] as RackRow)).toBe(false);
    const twice = fileRow(once, bottom.key, wish(bottom.key));
    expect(twice.map((r) => r.key)).toEqual([top.key, shoes.key]);
  });

  it('removes a row and Undo restores every removed row where it stood', () => {
    const a = removeRow(rows, [], top.key);
    const b = removeRow(a.rows, a.removed, shoes.key);
    expect(b.rows.map((r) => r.key)).toEqual([bottom.key]);
    expect(b.removed).toHaveLength(2);
    expect(restoreRows(b.rows, b.removed).map((r) => r.key)).toEqual(rows.map((r) => r.key));
  });

  it('ignores a key that is not on the rack', () => {
    const out = removeRow(rows, [], 'p-nothere0');
    expect(out.rows).toHaveLength(3);
    expect(out.removed).toHaveLength(0);
  });
});

describe('captureStage', () => {
  const rest = { rows: 0, finding: false, failed: false, settled: false, cleared: false };
  it('asks first, and offers the same card as optional once she skips or saves', () => {
    expect(captureStage(rest)).toBe('ask');
    expect(captureStage({ ...rest, settled: true })).toBe('photo');
  });
  it('is finding while the read runs, then the rack', () => {
    expect(captureStage({ ...rest, finding: true })).toBe('finding');
    expect(captureStage({ ...rest, rows: 3 })).toBe('rack');
  });
  it('keeps the photo when the read fails or every row is removed', () => {
    expect(captureStage({ ...rest, failed: true })).toBe('failed');
    expect(captureStage({ ...rest, cleared: true })).toBe('clear');
  });
});

describe('found rows and their crops', () => {
  const [top, bottom] = captureRows(READ, [found(0), found(1)], keys());
  if (!top || !bottom) throw new Error('two rows');
  const crop = (status: 'pending' | 'ready' | 'failed', renditions: unknown[] = []) => ({
    assetId: top.proposal?.capture?.cropAssetId ?? '',
    status,
    renditions,
  });

  it('keeps a look landing while any found row’s crop is still being made', () => {
    expect(cropsLanding(undefined)).toBe(false);
    expect(cropsLanding({ captureImages: {} })).toBe(false);
    expect(cropsLanding({ captureImages: { a: crop('ready'), b: crop('pending') } })).toBe(true);
    expect(cropsLanding({ captureImages: { a: crop('ready'), b: crop('failed') } })).toBe(false);
  });

  it('fetches the read for found rows a saved look holds no crop for, once per read', () => {
    const saved = (captureImages: Record<string, unknown>) => ({ status: 'saved', captureImages });
    expect(cropReads([top, bottom], saved({}))).toEqual([READ]);
    expect(cropReads([top, bottom], saved({ [top.key]: crop('pending') }))).toEqual([READ]);
    expect(
      cropReads([top, bottom], saved({ [top.key]: crop('pending'), [bottom.key]: crop('ready') })),
    ).toEqual([]);
    expect(cropReads([hers()], saved({}))).toEqual([]);
  });

  it('leaves a draft to its look, which its rows are written to at once', () => {
    expect(cropReads([top, bottom], { status: 'draft', captureImages: {} })).toEqual([]);
  });

  it('draws whichever crop has landed, the look’s first', () => {
    const ready = crop('ready', [{ width: 200 }]);
    expect(captureImage(top, ready, crop('ready'))).toBe(ready);
    expect(captureImage(top, crop('pending'), ready)).toBe(ready);
    const pending = crop('pending');
    expect(captureImage(top, pending, undefined)).toBe(pending);
    expect(captureImage(top, undefined, pending)).toBe(pending);
  });

  it('stands in a pending crop before anything has come back, and none for a failed one', () => {
    expect(captureImage(top, undefined, undefined)).toEqual({
      assetId: top.proposal?.capture?.cropAssetId,
      status: 'pending',
      width: null,
      height: null,
      blurhash: null,
      renditions: [],
    });
    expect(captureImage(top, undefined, crop('failed'))).toBeNull();
    expect(captureImage(hers(), undefined, undefined)).toBeNull();
  });
});

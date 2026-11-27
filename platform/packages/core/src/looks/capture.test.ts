import { describe, expect, it } from 'vitest';
import {
  captureImage,
  captureRows,
  captureStage,
  cropReads,
  cropsLanding,
  dismissSuggestion,
  type FoundPiece,
  filedCount,
  fileRow,
  filesOnly,
  isCaptureRow,
  putBack,
  rekeyed,
  rowKind,
  suggestedIds,
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

  it('keeps the colour and material the read saw, and nothing it did not', () => {
    const [full, bare] = captureRows(
      READ,
      [found(0, { colourShade: 'lime', material: 'cotton' }), found(1)],
      keys(),
    );
    expect(full?.proposal).toMatchObject({ color: 'Lime', capture: { material: 'cotton' } });
    expect(bare?.proposal).toMatchObject({ color: '', capture: { material: null } });
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
    expect(
      filesOnly(
        next,
        next.filter((r) => r.key !== bottom.key),
      ),
    ).toBe(false);
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
    // The row's one control goes by what it is (Annie, 27 Nov).
    expect(rowKind(once[0] as RackRow)).toBe('wish');
  });

  it('says what a row is: hers, found, a wish, or a piece Robes proposes', () => {
    expect(rowKind(hers())).toBe('owned');
    expect(rowKind(top)).toBe('found');
    const proposal = top.proposal as NonNullable<RackRow['proposal']>;
    expect(rowKind({ ...top, proposal: { ...proposal, capture: null } })).toBe('shop');
  });

  it('a suggestion dismissed leaves the row, which stays found', () => {
    const seen = captureRows(
      READ,
      [found(0, { match: { pieceId: HERS, confidence: 0.99 } }), found(1)],
      keys(),
    );
    const [first, second] = seen as [RackRow, RackRow];
    expect(suggestedIds(first)).toEqual([HERS]);
    expect(suggestedIds(second)).toEqual([]);
    const next = dismissSuggestion(seen, first.key);
    expect(suggestedIds(next[0] as RackRow)).toEqual([]);
    expect(rowKind(next[0] as RackRow)).toBe('found');
    expect(next[1]).toBe(second);
    // Nothing the picture wears changed.
    expect(next.map((r) => r.key)).toEqual(seen.map((r) => r.key));
  });

  it('Undo puts one row back where it stood, and takes off what it became', () => {
    // Taken off: back at its place, whatever else changed since.
    const without = rows.filter((r) => r.key !== bottom.key);
    expect(putBack(without, bottom, 1).map((r) => r.key)).toEqual(rows.map((r) => r.key));
    expect(putBack([shoes], bottom, 1).map((r) => r.key)).toEqual([shoes.key, bottom.key]);
    expect(putBack([], bottom, 5)).toEqual([bottom]);
    // Filed: the piece it became goes, and the found row is back where it stood, wherever the
    // look has since put her piece (the server lists her pieces first).
    const filed = fileRow(rows, shoes.key, hers());
    expect(putBack(filed, shoes, 2, HERS).map((r) => r.key)).toEqual(rows.map((r) => r.key));
    const reread = [hers(), top, bottom];
    expect(putBack(reread, shoes, 2, HERS).map((r) => r.key)).toEqual(rows.map((r) => r.key));
    // The filing only dropped it (her piece was on the rack already): back, her piece kept.
    const twice = fileRow(filed, bottom.key, hers());
    expect(putBack(twice, bottom, 1).map((r) => r.key)).toEqual([top.key, bottom.key, HERS]);
    // Already back: nothing is hung twice.
    expect(putBack(rows, bottom, 1)).toEqual(rows);
  });

  it('a found row put back after a wish takes a new key', () => {
    const next = rekeyed(bottom, 'p-new00000');
    expect(next.key).toBe('p-new00000');
    expect(next.proposal?.key).toBe('p-new00000');
    expect(next.proposal?.capture).toEqual(bottom.proposal?.capture);
    expect(rekeyed(hers())).toEqual(hers());
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

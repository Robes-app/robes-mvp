import { describe, expect, it } from 'vitest';
import {
  captureEyebrow,
  captureRows,
  captureStage,
  type FoundPiece,
  filedCount,
  fileRow,
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

  it('never hangs her piece twice', () => {
    const once = fileRow(rows, top.key, hers());
    const twice = fileRow(once, bottom.key, hers());
    expect(twice.map((r) => r.key)).toEqual([HERS, shoes.key]);
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

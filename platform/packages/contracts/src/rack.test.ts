import { applyAsk } from '@robes/core/looks';
import { pieceEyebrow } from '@robes/core/wardrobe';
import { describe, expect, it } from 'vitest';
import { askChanges, askRack, rackFromLook, rackUpdate } from './rack';

const coat = {
  id: '11111111-1111-4111-8111-111111111111',
  label: 'Camel coat',
  category: 'Outerwear' as const,
  brand: 'Max Mara',
};
const tee = {
  id: '22222222-2222-4222-8222-222222222222',
  label: 'Cream tee',
  category: 'Tops' as const,
  brand: null,
};
const mules = {
  key: 'p-aaaa1111',
  name: 'Black mules',
  category: 'Shoes' as const,
  color: 'black',
  brand: 'Toteme',
  retailerHint: 'toteme.com',
  pricePoint: '€390',
  role: 'exclamation' as const,
  wishlisted: false,
};

describe('the rack, shared by both clients', () => {
  const look = {
    pieces: [
      { piece: coat, role: 'anchor' as const },
      { piece: tee, role: 'canvas' as const },
    ],
    proposals: [mules],
    styling: { [tee.id]: 'tucked at the front' },
    edits: {},
  };

  it('reads a look in the formula’s order and writes it back', () => {
    const rack = rackFromLook(look as never);
    expect(rack.rows.map((r) => r.name)).toEqual(['Cream tee', 'Camel coat', 'Black mules']);
    expect(rackUpdate(rack, { keepEdits: false })).toEqual({
      pieces: [
        { pieceId: tee.id, role: 'canvas' },
        { pieceId: coat.id, role: 'anchor' },
      ],
      proposals: [mules],
      styling: { [tee.id]: 'tucked at the front' },
    });
  });

  it('sends the prompt her rack by id, the anchor kept, and lands an edit with its notes', () => {
    const rack = rackFromLook(look as never);
    expect(askRack(rack, coat.id)).toEqual([
      {
        key: tee.id,
        pieceId: tee.id,
        proposal: null,
        keep: false,
        was: null,
        styled: 'tucked at the front',
      },
      { key: coat.id, pieceId: coat.id, proposal: null, keep: true, was: null, styled: null },
      {
        key: 'p-aaaa1111',
        pieceId: null,
        proposal: { name: 'Black mules', category: 'Shoes', brand: 'Toteme' },
        keep: false,
        was: null,
        styled: null,
      },
    ]);
    const result = {
      swaps: [
        {
          key: 'p-aaaa1111',
          to: {
            pieceId: '33333333-3333-4333-8333-333333333333',
            name: 'Loafers',
            category: 'Shoes',
            brand: null,
          },
        },
      ],
      back: [],
      backAll: false,
      styled: [],
    };
    expect(askChanges(result)).toBe(true);
    const next = applyAsk(rack, result);
    const update = rackUpdate(next, { keepEdits: true });
    expect(update.proposals).toEqual([]);
    expect(update.edits).toEqual({
      '33333333-3333-4333-8333-333333333333': {
        was: expect.objectContaining({ key: 'p-aaaa1111' }),
      },
    });
    expect(askChanges({ swaps: [], back: [], backAll: false, styled: [] })).toBe(false);
  });

  it('carries each piece’s subcategory, so the rack and the wardrobe share one eyebrow', () => {
    const knit = { ...tee, label: 'Grey jumper', categoryL2: 'Jumpers & sweaters', brand: 'COS' };
    const rack = rackFromLook({ ...look, pieces: [{ piece: knit, role: 'canvas' }] } as never);
    const row = rack.rows.find((r) => r.pieceId === knit.id);
    expect(row).toMatchObject({ category: 'Tops', categoryL2: 'Jumpers & sweaters' });
    if (!row) throw new Error('no row');
    expect(pieceEyebrow({ ...row, categoryL2: row.categoryL2 ?? null })).toEqual({
      category: 'Knitwear',
      brand: 'COS',
    });
  });
});

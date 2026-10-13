import { describe, expect, it } from 'vitest';
import { buildSystem, fakeOutput, normalisePieces, Output, VERSION } from './v2';

const closet = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    label: 'Camel coat',
    category: 'Outerwear',
    color: 'Camel',
    brand: 'Max Mara',
    timesWorn: 2,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    label: 'Straight jeans',
    category: 'Bottoms',
    color: 'Blue',
    brand: null,
    timesWorn: 0,
  },
];
const ctx = {
  firstName: 'Niall',
  gender: 'woman' as const,
  styleIcons: [],
  closet,
  styleDna: {},
  wardrobeCount: 2,
};

describe('looks.style_piece v2 (legacy beta 2026-09-28)', () => {
  it('numbers the closet, keeps the WHAT-not-HOW line and asks for itemised pieces', () => {
    const system = buildSystem(ctx);
    expect(VERSION).toBe(2);
    expect(system).toContain(
      "THE USER'S DIGITISED WARDROBE (2 pieces, numbered from 0): [0] Camel coat [Outerwear], Camel, worn 2×; [1] Straight jeans [Bottoms], Blue.",
    );
    expect(system).toContain('they are never a licence to contort HOW a piece is worn');
    expect(system).toContain('THE PIECES: alongside the prose');
  });

  it('normalises pieces like legacy: owned resolves, bad hex and role drop, at most six', () => {
    const raw = [
      {
        name: 'Camel coat',
        category: 'Outerwear',
        color: 'camel',
        color_hex: '#C19A6B',
        role: 'the anchor',
        wardrobe_index: 0,
        brand: 'ignored',
        price_point: '€999',
      },
      {
        name: 'Silk shirt',
        category: 'Nonsense',
        color: 'ivory',
        color_hex: 'ivory',
        role: 'Hero',
        wardrobe_index: 7,
        brand: 'Toteme',
        retailer_hint: 'toteme.com',
        price_point: '€290',
      },
      { name: '   ', category: 'Tops', color: '', color_hex: '', role: '', wardrobe_index: -1 },
      ...Array.from({ length: 6 }, (_, i) => ({
        name: `Extra ${i}`,
        category: 'Bags',
        color: 'x',
        color_hex: '#000000',
        role: 'The Texture',
        wardrobe_index: -1,
      })),
    ];
    const out = normalisePieces(raw, closet);
    expect(out).toHaveLength(6);
    expect(out[0]).toMatchObject({
      role: 'The Anchor',
      colorHex: '#C19A6B',
      brand: 'Max Mara',
      pricePoint: '',
      pieceId: closet[0]?.id,
    });
    expect(out[1]).toMatchObject({
      category: 'Other',
      colorHex: null,
      role: null,
      brand: 'Toteme',
      pieceId: null,
    });
  });

  it('fake output validates with pieces', () => {
    const fake = Output.parse(fakeOutput('Navy blazer'));
    expect(fake.ways.every((w) => w.pieces.length >= 3)).toBe(true);
  });
});

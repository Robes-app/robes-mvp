import { describe, expect, it } from 'vitest';
import { buildUser as buildAnalyseUser, LABEL_RULE } from '../wardrobe-analyse/v2';
import {
  buildUser,
  type ClosetEntry,
  closetCategoriesIn,
  fakeOutput,
  fieldRules,
  Output,
  type ReadPiece,
  toPieces,
} from './v1';

const CLOSET: ClosetEntry[] = [
  {
    id: '00000000-0000-4000-8000-00000000000a',
    label: 'Cream silk shirt',
    category: 'Tops',
    color: 'Cream',
    brand: 'Studio',
  },
  {
    id: '00000000-0000-4000-8000-00000000000b',
    label: 'White running shoes',
    category: 'Shoes',
    color: 'White',
    brand: 'Salomon',
  },
];

function piece(over: Partial<ReadPiece>): ReadPiece {
  const [tee] = fakeOutput().pieces;
  if (!tee) throw new Error('fixture');
  return { ...tee, ...over };
}

describe('wardrobe.pieces v1', () => {
  it('shares the single read’s field rules, one text', () => {
    expect(buildAnalyseUser().endsWith(fieldRules())).toBe(true);
    expect(fieldRules()).toContain(LABEL_RULE);
    expect(buildUser([])).toContain(fieldRules());
  });

  it('asks for every piece once — a pair of shoes is one piece — with a box each', () => {
    const user = buildUser([]);
    expect(user).toContain('a pair of shoes is ONE piece');
    expect(user).toContain('At most 8 pieces');
    expect(user).toContain('"box": where THIS piece sits');
    expect(user).toContain('She has no pieces filed yet');
  });

  it('numbers her wardrobe as data and asks for the match against that list', () => {
    const user = buildUser(CLOSET);
    expect(user).toContain(
      '<user_input>\n[0] Cream silk shirt · Tops · Cream · Studio\n[1] White running shoes · Shoes · White · Salomon\n</user_input>',
    );
    expect(user).toContain(
      'Shoes, bags, sunglasses and jewellery match on their kind and colour alone',
    );
    expect(closetCategoriesIn(user)).toEqual(['Tops', 'Shoes']);
  });

  it('reads each piece through the single read’s shape and resolves the match to her piece', () => {
    const pieces = toPieces(Output.parse(fakeOutput(['Tops', 'Shoes'])), CLOSET);
    expect(pieces.map((p) => [p.index, p.label, p.category, p.categoryL3])).toEqual([
      [0, 'Cream long-sleeve t-shirt', 'Tops', 'Long-sleeve t-shirt'],
      [1, 'Black leggings', 'Bottoms', 'Leggings'],
      [2, 'White running shoes', 'Shoes', 'Running shoe'],
    ]);
    expect(pieces[2]?.match).toEqual({ pieceId: CLOSET[1]?.id, confidence: 0.8 });
    expect(pieces[0]?.match).toBeNull();
    expect(pieces[2]?.brand).toBe('Salomon');
    expect(pieces[0]?.itemDna).toMatchObject({ prompt_version: 'wardrobe.pieces@1' });
  });

  it('never trusts a match outside the list, dedupes, clamps boxes and folds pairs', () => {
    const out = Output.parse({
      no_item_detected: false,
      pieces: [
        piece({
          wardrobe_index: 7,
          match_confidence: 3,
          box: { x: 0.2, y: 0.1, w: 0.002, h: 0.5 },
        }),
        piece({ wardrobe_index: -1 }),
        piece({
          label: 'Gold heeled sandals',
          category: 'Shoes',
          category_l2: 'Sandals',
          category_l3: '',
          box: { x: 0.1, y: 0.8, w: 0.1, h: 0.1 },
          wardrobe_index: -1,
        }),
        piece({
          label: 'Silver heeled sandals',
          category: 'Shoes',
          category_l2: 'Sandals',
          category_l3: '',
          box: { x: 0.3, y: 0.8, w: 0.1, h: 0.15 },
          wardrobe_index: 1,
          match_confidence: 0.6,
        }),
        piece({ label: '', wardrobe_index: -1 }),
      ],
    });
    const pieces = toPieces(out, CLOSET);
    expect(pieces).toHaveLength(2);
    expect(pieces[0]).toMatchObject({ match: null, box: { x: 0, y: 0, w: 1, h: 1 } });
    expect(pieces[1]).toMatchObject({
      index: 1,
      label: 'Gold heeled sandals',
      match: { pieceId: CLOSET[1]?.id, confidence: 0.6 },
    });
    expect(pieces[1]?.box.w).toBeCloseTo(0.3);
  });

  it('keeps at most eight and nothing when no piece is seen', () => {
    const many = Output.parse({
      no_item_detected: false,
      pieces: Array.from({ length: 12 }, (_, i) =>
        piece({ label: `Piece ${i}`, wardrobe_index: -1 }),
      ),
    });
    expect(toPieces(many, [])).toHaveLength(8);
    expect(toPieces(Output.parse({ no_item_detected: true, pieces: [] }), [])).toEqual([]);
  });

  it('the fake matches the trainers only when she owns shoes', () => {
    expect(fakeOutput([]).pieces.every((p) => p.wardrobe_index === -1)).toBe(true);
    expect(fakeOutput(['Tops', 'Shoes']).pieces[2]?.wardrobe_index).toBe(1);
  });
});

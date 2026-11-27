import { describe, expect, it } from 'vitest';
import { geminiSchema } from '../../gemini';
import { buildUser as buildUserV4, type ClosetEntry } from './v4';
import { ALSO_MAX, ALSO_RULE, buildUser, fakeOutput, Output, toPieces, VERSION } from './v5';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const shoe = (n: number, label: string): ClosetEntry => ({
  id: id(n),
  label,
  category: 'Shoes',
  color: 'White',
  brand: null,
});
const CLOSET: ClosetEntry[] = [
  shoe(1, 'White trainers'),
  { id: id(2), label: 'Cream tee', category: 'Tops', color: 'Cream', brand: null },
  shoe(3, 'White runners'),
  shoe(4, 'Chalk plimsolls'),
  shoe(5, 'White tennis shoes'),
];

describe('wardrobe.pieces v5 (her other pieces a found one may be)', () => {
  it('adds the one rule to v4, and nothing else changes', () => {
    const user = buildUser(CLOSET);
    expect(VERSION).toBe(5);
    expect(user).toContain(ALSO_RULE);
    expect(user.replace(`\n${ALSO_RULE}`, '')).toBe(buildUserV4(CLOSET));
    // Nothing filed, nothing to number: v4 as it was.
    expect(buildUser([])).toBe(buildUserV4([]));
  });

  it('asks for the list on every piece', () => {
    const schema = geminiSchema(Output) as {
      properties: { pieces: { items: { required: string[] } } };
    };
    expect(schema.properties.pieces.items.required).toEqual(
      expect.arrayContaining(['also_indexes', 'wardrobe_index', 'worn']),
    );
  });

  it('keeps her other pieces in order, under v5', () => {
    const out = fakeOutput(CLOSET.map((c) => c.category ?? ''));
    const pieces = toPieces(Output.parse(out), CLOSET);
    expect(pieces).toHaveLength(3);
    expect(pieces[2]?.match?.pieceId).toBe(id(1));
    expect(pieces[2]?.alsoMatches).toEqual([id(3), id(4)]);
    expect(pieces[0]).toMatchObject({ match: null, alsoMatches: [], worn: false });
    expect(pieces[2]?.itemDna).toMatchObject({ prompt_version: 'wardrobe.pieces@5' });
  });

  it('never the match itself, a piece twice, a number off the list, or more than it keeps', () => {
    const out = fakeOutput(['Shoes']);
    const [tee, , shoes] = out.pieces;
    if (!tee || !shoes) throw new Error('fixture');
    shoes.wardrobe_index = 0;
    shoes.also_indexes = [0, 2, 2, 99, -1, 3, 4];
    // No match, so nothing beside it.
    tee.also_indexes = [1];
    const pieces = toPieces(Output.parse(out), CLOSET);
    expect(pieces[2]?.alsoMatches).toEqual([id(3), id(4)]);
    expect(pieces[2]?.alsoMatches).toHaveLength(ALSO_MAX);
    expect(pieces[0]?.alsoMatches).toEqual([]);
  });
});

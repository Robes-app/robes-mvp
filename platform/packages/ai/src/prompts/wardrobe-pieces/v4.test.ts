import { describe, expect, it } from 'vitest';
import { geminiSchema } from '../../gemini';
import { buildUser as buildAnalyseUser, DETAIL_RULE, WORN_RULE } from '../wardrobe-analyse/v6';
import { buildUser as buildUserV3, type ClosetEntry } from './v3';
import { buildUser, fakeOutput, fieldRules, Output, toPieces, VERSION } from './v4';

const CLOSET: ClosetEntry[] = [
  {
    id: '00000000-0000-4000-8000-00000000000a',
    label: 'Black ankle boots',
    category: 'Shoes',
    color: 'Black',
    brand: null,
  },
];

describe('wardrobe.pieces v4 (the defining detail, and whether a piece is worn)', () => {
  it("carries the single read's v6 field rules, and nothing else changes", () => {
    const user = buildUser(CLOSET);
    expect(VERSION).toBe(4);
    expect(user).toContain(fieldRules());
    expect(fieldRules()).toBe(buildAnalyseUser().slice(buildAnalyseUser().indexOf('"label":')));
    expect(user).toContain(DETAIL_RULE);
    expect(user).toContain(WORN_RULE);
    // Take the two additions out and it is v3, to the letter.
    expect(user.replace(DETAIL_RULE, '').replace(WORN_RULE, '')).toBe(buildUserV3(CLOSET));
    expect(user).toContain('[0] Black ankle boots · Shoes · Black');
  });

  it('asks for both on every piece', () => {
    const schema = geminiSchema(Output) as {
      properties: { pieces: { items: { required: string[] } } };
    };
    expect(schema.properties.pieces.items.required).toEqual(
      expect.arrayContaining(['defining_detail', 'worn', 'box', 'brand_check']),
    );
  });

  it('files each piece with its detail and whether it was worn, under v4', () => {
    const out = fakeOutput(['Shoes']);
    const [tee, leggings] = out.pieces;
    if (!tee || !leggings) throw new Error('fixture');
    tee.defining_detail = 'Raglan sleeve with contrast seams';
    leggings.worn = true;
    const pieces = toPieces(Output.parse(out), CLOSET);
    expect(pieces).toHaveLength(3);
    expect(pieces[0]).toMatchObject({ label: 'Cream long-sleeve t-shirt', worn: false });
    expect(pieces[0]?.itemDna).toMatchObject({
      structural_dna: {
        silhouette_fit: ['Fitted', 'Long-sleeve'],
        defining_detail: 'Raglan sleeve with contrast seams',
      },
      prompt_version: 'wardrobe.pieces@4',
    });
    expect(pieces[1]).toMatchObject({ label: 'Black leggings', worn: true });
    expect(pieces[1]?.itemDna.structural_dna).not.toHaveProperty('defining_detail');
    // Everything v3 did still holds: the runners match her boots' slot.
    expect(pieces[2]?.match?.pieceId).toBe(CLOSET[0]?.id);
    expect(pieces.map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it("a pair folded into one piece keeps the first shoe's answer", () => {
    const out = fakeOutput();
    const [, , shoes] = out.pieces;
    if (!shoes) throw new Error('fixture');
    out.pieces.push({
      ...shoes,
      label: 'Chalk running shoes',
      worn: true,
      box: { x: 0.5, y: 0.85, w: 0.2, h: 0.1 },
    });
    const pieces = toPieces(Output.parse(out), []);
    expect(pieces.filter((p) => p.category === 'Shoes')).toHaveLength(1);
    expect(pieces.find((p) => p.category === 'Shoes')?.worn).toBe(false);
  });
});

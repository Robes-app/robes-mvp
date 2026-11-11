import { describe, expect, it } from 'vitest';
import { geminiSchema } from '../../gemini';
import { BRAND_RULE_V1, BRAND_RULES, buildUser as buildAnalyseUser } from '../wardrobe-analyse/v5';
import { buildUser as buildUserV2, type ClosetEntry, SYSTEM as SYSTEM_V2 } from './v2';
import { buildUser, fakeOutput, fieldRules, Output, SYSTEM, toPieces, VERSION } from './v3';

const CLOSET: ClosetEntry[] = [
  {
    id: '00000000-0000-4000-8000-00000000000a',
    label: 'Black ankle boots',
    category: 'Shoes',
    color: 'Black',
    brand: null,
  },
];

describe('wardrobe.pieces v3 (the v5 brand rules)', () => {
  it("carries the single read's v5 field rules, and nothing else changes", () => {
    const user = buildUser(CLOSET);
    expect(VERSION).toBe(3);
    expect(user).toContain(fieldRules());
    expect(user).toContain(BRAND_RULES);
    expect(fieldRules()).toBe(buildAnalyseUser().slice(buildAnalyseUser().indexOf('"label":')));
    expect(user.replace(BRAND_RULES, BRAND_RULE_V1)).toBe(buildUserV2(CLOSET));
    expect(user).toContain('[0] Black ankle boots · Shoes · Black');
  });

  it('files every piece, and says a brand from the design is flagged', () => {
    expect(SYSTEM).toContain('file every piece in it');
    expect(SYSTEM).toContain('flagged for her to check');
    expect(SYSTEM_V2).toContain('that are not visible');
  });

  it('asks for the check on every piece', () => {
    const schema = geminiSchema(Output) as {
      properties: { pieces: { items: { required: string[] } } };
    };
    expect(schema.properties.pieces.items.required).toContain('brand_check');
  });

  it('a brand read from the design files with its check, under v3', () => {
    const out = fakeOutput(['Shoes']);
    const [tee] = out.pieces;
    if (!tee) throw new Error('fixture');
    tee.brand = 'Sézane';
    tee.brand_check = true;
    const pieces = toPieces(Output.parse(out), CLOSET);
    expect(pieces[0]).toMatchObject({ brand: 'Sézane' });
    expect(pieces[0]?.itemDna).toMatchObject({
      brand_check: true,
      prompt_version: 'wardrobe.pieces@3',
    });
    // A printed brand (the Salomon runners) carries no check, and still matches her boots' slot.
    const shoes = pieces.find((p) => p.category === 'Shoes');
    expect(shoes?.brand).toBe('Salomon');
    expect(shoes?.itemDna).not.toHaveProperty('brand_check');
    expect(shoes?.match?.pieceId).toBe(CLOSET[0]?.id);
  });
});

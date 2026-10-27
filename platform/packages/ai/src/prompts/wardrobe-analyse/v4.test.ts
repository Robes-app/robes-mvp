import { describe, expect, it } from 'vitest';
import { geminiSchema } from '../../gemini';
import { buildUser as buildUserV3 } from './v3';
import { buildUser, fakeOutput, Output, toPiece, VERSION } from './v4';

describe('wardrobe.analyse v4 (the material model)', () => {
  it('adds the material rules after the colour rules, keeping everything before', () => {
    const user = buildUser();
    expect(VERSION).toBe(4);
    expect(buildUserV3()).not.toContain('"material":');
    expect(user).toContain('"colour_shade":');
    expect(user).toContain('"material": the ONE material');
    expect(user).toContain('care or composition label');
    expect(user).toContain('95% cotton, 5% elastane is cotton');
    expect(user).toContain('polyamide — Polyamide (also nylon)');
    expect(user).toContain('"material_check": true ONLY');
    expect(user.indexOf('"color": the display name')).toBeLessThan(user.indexOf('"material":'));
    expect(user.indexOf('"material":')).toBeLessThan(user.indexOf('"primary_color_hex"'));
  });

  it('leaves material optional for Gemini, never an empty enum value', () => {
    const schema = geminiSchema(Output) as {
      required: string[];
      properties: { material: { enum: string[] } };
    };
    expect(schema.required).not.toContain('material');
    expect(schema.required).toContain('material_check');
    expect(schema.properties.material.enum).not.toContain('');
    expect(schema.properties.material.enum).toHaveLength(40);
  });

  it('files the material, and a check only beside a material', () => {
    const piece = toPiece(
      Output.parse({ ...fakeOutput(), material: 'denim', material_check: true }),
    );
    expect(piece).toMatchObject({ material: 'denim', colourShade: 'camel' });
    expect(piece.itemDna).toMatchObject({ material_check: true, prompt_version: 4 });

    const plain = toPiece(Output.parse(fakeOutput()));
    expect(plain.material).toBe('wool');
    expect(plain.itemDna).not.toHaveProperty('material_check');

    const unread = toPiece(
      Output.parse({ ...fakeOutput(), material: undefined, material_check: true }),
    );
    expect(unread.material).toBeNull();
    expect(unread.itemDna).not.toHaveProperty('material_check');
  });

  it('an empty read files no material, and an id off the list is refused', () => {
    const none = toPiece(Output.parse({ ...fakeOutput(), no_item_detected: true }));
    expect(none).toMatchObject({ noItemDetected: true, material: null });
    expect(Output.safeParse({ ...fakeOutput(), material: 'nylon' }).success).toBe(false);
    expect(Output.safeParse({ ...fakeOutput(), material: '' }).success).toBe(false);
  });
});

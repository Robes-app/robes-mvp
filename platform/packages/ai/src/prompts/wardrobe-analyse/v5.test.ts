import { describe, expect, it } from 'vitest';
import { geminiSchema } from '../../gemini';
import { buildUser as buildUserV4, SYSTEM as SYSTEM_V4 } from './v4';
import { BRAND_RULE_V1, buildUser, fakeOutput, Output, SYSTEM, toPiece, VERSION } from './v5';

describe('wardrobe.analyse v5 (a brand from its signature design)', () => {
  it('swaps only the brand rule, in place', () => {
    const user = buildUser();
    expect(VERSION).toBe(5);
    expect(buildUserV4()).toContain(BRAND_RULE_V1);
    expect(user).not.toContain(BRAND_RULE_V1);
    expect(user).toContain('unmistakably its signature');
    expect(user).toContain('never for a generic piece');
    expect(user).toContain('"brand_check": true when');
    expect(user.indexOf('"editorial_color_name"')).toBeLessThan(user.indexOf('"brand":'));
    expect(user.indexOf('"brand_check"')).toBeLessThan(user.indexOf('"silhouette_fit"'));
    // Everything around the brand is v4's, untouched.
    expect(user.replace(/"brand": [^\n]*\n"brand_check": [^\n]*\n/, BRAND_RULE_V1)).toBe(
      buildUserV4(),
    );
  });

  it('no longer forbids a brand read from the design, and says it is flagged', () => {
    expect(SYSTEM_V4).toContain('never invent details that are not visible');
    expect(SYSTEM).not.toContain('that are not visible');
    expect(SYSTEM).toContain('flagged for her to check');
  });

  it('asks Gemini for the check every time', () => {
    const schema = geminiSchema(Output) as { required: string[] };
    expect(schema.required).toContain('brand_check');
  });

  it('flags a brand read from the design, and only beside a brand', () => {
    const named = toPiece(Output.parse({ ...fakeOutput(), brand: 'Barbour', brand_check: true }));
    expect(named.brand).toBe('Barbour');
    expect(named.itemDna).toMatchObject({ brand_check: true, prompt_version: 5 });

    const printed = toPiece(
      Output.parse({ ...fakeOutput(), brand: 'Barbour', brand_check: false }),
    );
    expect(printed.itemDna).not.toHaveProperty('brand_check');

    const none = toPiece(Output.parse({ ...fakeOutput(), brand: ' ', brand_check: true }));
    expect(none.brand).toBeNull();
    expect(none.itemDna).not.toHaveProperty('brand_check');
  });

  it('keeps every v4 field', () => {
    const piece = toPiece(Output.parse(fakeOutput()));
    expect(piece).toMatchObject({
      material: 'wool',
      colourShade: 'camel',
      label: 'Camel wool coat',
    });
  });
});

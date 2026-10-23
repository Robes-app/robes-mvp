import { describe, expect, it } from 'vitest';
import { buildUser as buildUserV2 } from './v2';
import { buildUser, fakeOutput, Output, toPiece, VERSION } from './v3';

describe('wardrobe.analyse v3 (the colour model)', () => {
  it('swaps the fixed colour list for the shade, extras, print and check rules', () => {
    const user = buildUser();
    expect(VERSION).toBe(3);
    expect(buildUserV2()).toContain('"color": ONE of White');
    expect(user).not.toContain('"color": ONE of');
    expect(user).toContain('"colour_shade":');
    expect(user).toContain('softblack (Soft black)');
    expect(user).toContain('PATTERNS: plain (no print)');
    expect(user).toContain('Outerwear › Coats:');
    expect(user).toContain('never the brand');
  });

  it('files the shade, its name as the colour word, the extras and the print', () => {
    const piece = toPiece(
      Output.parse({
        ...fakeOutput(),
        colour_shade: 'navy',
        color: 'anything',
        colour_extra: ['optic', 'navy', 'Gold', 'nope', 'optic'],
        print: 'stripes',
        colour_check: true,
      }),
    );
    expect(piece).toMatchObject({
      color: 'Navy',
      colourShade: 'navy',
      colourExtra: ['optic', 'gold'],
      print: 'stripes',
    });
    expect(piece.itemDna).toMatchObject({ colour_check: true, prompt_version: 3 });
  });

  it('a plain piece has no print, and an empty read files no colour', () => {
    expect(toPiece(Output.parse(fakeOutput()))).toMatchObject({ color: 'Camel', print: null });
    const none = toPiece(Output.parse({ ...fakeOutput(), no_item_detected: true }));
    expect(none).toMatchObject({ noItemDetected: true, colourShade: null, colourExtra: [] });
  });

  it('rejects a shade outside the model', () => {
    expect(Output.safeParse({ ...fakeOutput(), colour_shade: 'chartreuse' }).success).toBe(false);
  });
});

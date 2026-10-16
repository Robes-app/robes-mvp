import { describe, expect, it } from 'vitest';
import { buildUser, fakeOutput, Output, toPiece } from './v1';

describe('wardrobe.analyse v1', () => {
  it('includes the taxonomy and the fixed palette', () => {
    const prompt = buildUser();
    expect(prompt).toContain('Outerwear › Coats:');
    expect(prompt).toContain('Vermillion');
  });

  it('lets the taxonomy decide the category and parses printed values defensively', () => {
    const piece = toPiece(
      Output.parse({
        ...fakeOutput(),
        category: 'Tops',
        price: '€1,295.00',
        currency: 'eur',
        size: ' UK 10 ',
      }),
    );
    expect(piece).toMatchObject({
      categoryL2: 'Coats',
      categoryL3: 'Wool coat',
      price: 1295,
      currency: 'EUR',
      size: 'UK 10',
    });
  });

  it('drops invalid colours, hexes and taxonomy nodes', () => {
    const piece = toPiece(
      Output.parse({
        ...fakeOutput(),
        color: 'Chartreuse',
        primary_color_hex: 'red',
        category_l2: 'Spacesuits',
      }),
    );
    expect(piece).toMatchObject({ color: null, categoryL2: null, categoryL3: null });
    expect((piece.itemDna.display as { primary_color_hex: string }).primary_color_hex).toBe('');
  });

  it('flags photos with no piece', () => {
    expect(toPiece(Output.parse({ ...fakeOutput(), no_item_detected: true })).noItemDetected).toBe(
      true,
    );
  });
});

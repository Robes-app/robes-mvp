import { describe, expect, it } from 'vitest';
import { buildUser, FEATURE, fakeOutput, Output, SYSTEM, toRead, VERSION } from './v2';

const page = {
  category: 'Cardigans',
  options: 'Medium / 100% Cashmere / Vibrant Pink',
  color: null,
  description: 'A classic lightweight cashmere cardigan. 100% cashmere. Mother of pearl buttons.',
};

describe('inbox.receipt_photo v2', () => {
  it('reads a receipt line or a pasted link, with the colour model and the material', () => {
    expect(FEATURE).toBe('inbox.receipt_photo');
    expect(VERSION).toBe(2);
    expect(SYSTEM).toContain("a shop's product page she pasted");
    expect(SYSTEM).toContain('the photograph is the truth');
    expect(SYSTEM).toContain('"colour_shade":');
    expect(SYSTEM).toContain('"print":');
    expect(SYSTEM).toContain('A composition the shop states ("100% cashmere"');
    // v1's short colour list and the analyse prompt's check flags are gone.
    expect(SYSTEM).not.toContain('pick ONE from this list only');
    expect(SYSTEM).not.toContain('colour_check');
    expect(SYSTEM).not.toContain('material_check');
  });

  it("fences what the shop's page says, so it is data, never instructions", () => {
    const user = buildUser({
      label: 'The Everyday Cashmere Cardigan in Vibrant Pink',
      brand: 'Lucy Nagle',
      size: null,
      retailer: 'Lucy Nagle',
      page,
    });
    expect(user).toContain("WHAT THE SHOP'S PAGE SAYS OF THIS PIECE:");
    expect(user).toContain(
      'options: <user_input>\nMedium / 100% Cashmere / Vibrant Pink\n</user_input>',
    );
    expect(user).toContain('category: <user_input>\nCardigans\n</user_input>');
    // A receipt line has no page.
    const receipt = buildUser({ label: 'REF 0233', brand: 'Zara', size: 'M', retailer: 'Zara' });
    expect(receipt).toContain('WHAT THE EMAIL PRINTED FOR THIS ROW');
    expect(receipt).not.toContain('description:');
  });

  it('files the shade, its name, the print and a listed material', () => {
    const read = toRead(
      Output.parse({
        ...fakeOutput(),
        label: 'Pink cashmere cardigan',
        category_l2: 'Knitwear',
        category_l3: 'Cardigans',
        material: 'cashmere',
        print: 'plain',
      }),
    );
    expect(read).toMatchObject({
      label: 'Pink cashmere cardigan',
      material: 'cashmere',
      print: null,
    });
    expect(read?.colourShade).toBe(fakeOutput().colour_shade);
    expect(read?.color).toBeTruthy();
  });

  it('leaves out what it could not tell, and keeps the line when no piece shows', () => {
    const { material: _, ...noMaterial } = fakeOutput();
    expect(toRead(noMaterial)).toMatchObject({ material: null });
    expect(toRead({ ...fakeOutput(), colour_extra: ['not-a-shade'] })?.colourExtra).toEqual([]);
    expect(toRead({ ...fakeOutput(), no_item_detected: true })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { buildUser, FEATURE, fakeOutput, Output, SYSTEM, toRead, VERSION } from './v1';

describe('inbox.receipt_photo v1', () => {
  it('lets the photograph decide, and never files a reference code, size or brand as the name', () => {
    expect(FEATURE).toBe('inbox.receipt_photo');
    expect(VERSION).toBe(1);
    expect(SYSTEM).toContain('the photograph is the truth');
    expect(SYSTEM).toContain('Never a size, a price, a reference code or the brand.');
    expect(SYSTEM).toContain('TAXONOMY:');
  });

  it('fences what the email printed, so the text is data, never instructions', () => {
    const user = buildUser({
      label: 'REF 02335709800',
      brand: 'Zara',
      size: '6/7 years (122 cm)',
      retailer: 'Zara',
    });
    expect(user).toContain('<user_input>\nREF 02335709800\n</user_input>');
    expect(user).toContain('<user_input>\n6/7 years (122 cm)\n</user_input>');
  });

  it('reads a photo into a name, a validated category and a listed colour', () => {
    const read = toRead(
      Output.parse({
        no_item_detected: false,
        label: '  Black flare leggings ',
        category_l2: 'trousers',
        category_l3: 'Leggings',
        color: 'black',
      }),
    );
    expect(read).toEqual({
      label: 'Black flare leggings',
      categoryL2: 'Trousers',
      categoryL3: 'Leggings',
      color: 'Black',
    });
  });

  it('keeps the receipt as printed when the photo shows no piece or names none', () => {
    expect(toRead({ ...fakeOutput(), no_item_detected: true })).toBeNull();
    expect(toRead({ ...fakeOutput(), label: '  ' })).toBeNull();
  });

  it('drops a category outside the taxonomy and a colour outside the list', () => {
    expect(
      toRead({ ...fakeOutput(), category_l2: 'Spacesuits', category_l3: '', color: 'Mauve-ish' }),
    ).toMatchObject({ categoryL2: null, categoryL3: null, color: null });
  });

  it('has a fixture the fake provider can answer with', () => {
    expect(toRead(fakeOutput())).toMatchObject({
      label: 'Pink velour tracksuit top',
      categoryL2: 'Sweatshirts & hoodies',
    });
  });
});

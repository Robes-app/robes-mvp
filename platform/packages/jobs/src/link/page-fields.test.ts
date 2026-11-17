import { describe, expect, it } from 'vitest';
import { pageFields } from './page-fields';

const page = (over: Partial<Parameters<typeof pageFields>[0] & object> = {}) => ({
  category: null,
  options: null,
  color: null,
  description: null,
  ...over,
});

describe('pageFields', () => {
  it("settles a Shopify page's category and stated composition (Lucy Nagle)", () => {
    expect(
      pageFields(
        page({
          category: 'Cardigans',
          options: 'Medium / 100% Cashmere / Vibrant Pink',
          description: 'A classic lightweight cashmere cardigan. 100% cashmere.',
        }),
      ),
    ).toMatchObject({ categoryL2: 'Cardigans', material: 'cashmere' });
  });

  it('reads the main fibre of a blend in the description, as on a label', () => {
    expect(pageFields(page({ description: 'Shell: 70% wool, 30% silk. Dry clean.' }))).toEqual({
      material: 'wool',
    });
  });

  it('never takes a material from words that only mention one', () => {
    expect(pageFields(page({ description: 'Pairs well with a silk shirt.' }))).toEqual({});
    expect(pageFields(page({ options: 'Medium / Vibrant Pink' }))).toEqual({});
  });

  it("takes a colour only when it names one of Robes' shades", () => {
    expect(pageFields(page({ color: 'Algae' }))).toEqual({});
    expect(pageFields(page({ color: 'Navy' }))).toMatchObject({
      color: 'Navy',
      colourShade: expect.any(String),
    });
  });

  it('leaves out a category Robes does not file, and nothing without a page', () => {
    expect(pageFields(page({ category: 'New in' }))).toEqual({});
    expect(pageFields(null)).toEqual({});
  });
});

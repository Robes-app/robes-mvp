import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb } from './contrast';

describe('contrast', () => {
  it('parses hex', () => {
    expect(hexToRgb('#202021')).toEqual([32, 32, 33]);
    expect(() => hexToRgb('red')).toThrow();
  });
  it('computes WCAG ratios', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrastRatio(hexToRgb('#202021'), hexToRgb('#FAF8F5'))).toBeCloseTo(15.36, 1);
  });
  it('blends alpha colours over a background', () => {
    const border = blend(hexToRgb('#202021'), 0.5, hexToRgb('#FAF8F5'));
    expect(contrastRatio(border, hexToRgb('#FAF8F5'))).toBeCloseTo(3.17, 1);
  });
});

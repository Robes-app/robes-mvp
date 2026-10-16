import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, hexToRgb, type Rgb } from './contrast';
import { type ColorRef, dark, light, pairs, palette, semanticNames } from './tokens';

function resolve(ref: ColorRef, bg: Rgb): Rgb {
  if (typeof ref === 'string') return hexToRgb(palette[ref]);
  return blend(hexToRgb(palette[ref.base]), ref.alpha, bg);
}

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s mode', (_mode, map) => {
  it('defines every semantic token', () => {
    for (const name of semanticNames) expect(map[name]).toBeDefined();
  });

  it.each(pairs)('$fg on $bg meets $min:1', ({ fg, bg, min }) => {
    const bgRef = map[bg];
    if (typeof bgRef !== 'string') throw new Error(`background ${bg} must be opaque`);
    const bgRgb = hexToRgb(palette[bgRef]);
    expect(contrastRatio(resolve(map[fg], bgRgb), bgRgb)).toBeGreaterThanOrEqual(min);
  });
});

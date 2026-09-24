import { hexToRgb } from './contrast';
import { type ColorRef, dark, light, palette, type Semantic } from './tokens';

// CSS colour value for a token reference: hex for opaque tokens, rgba for alpha tokens.
export function colorValue(ref: ColorRef): string {
  if (typeof ref === 'string') return palette[ref];
  const [r, g, b] = hexToRgb(palette[ref.base]);
  return `rgba(${r}, ${g}, ${b}, ${ref.alpha})`;
}

// A semantic colour resolved for a theme (native props that can't take a className).
export function semanticColor(theme: 'light' | 'dark', name: Semantic): string {
  return colorValue((theme === 'dark' ? dark : light)[name]);
}

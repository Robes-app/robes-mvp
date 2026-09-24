import { hexToRgb } from './contrast';
import {
  type ColorRef,
  dark,
  font,
  light,
  palette,
  radius,
  type Semantic,
  semanticNames,
} from './tokens';

function value(ref: ColorRef): string {
  if (typeof ref === 'string') return palette[ref];
  const [r, g, b] = hexToRgb(palette[ref.base]);
  return `rgba(${r}, ${g}, ${b}, ${ref.alpha})`;
}

function modeVars(map: Record<Semantic, ColorRef>, indent: string): string {
  return semanticNames.map((name) => `${indent}--${name}: ${value(map[name])};`).join('\n');
}

export function buildThemeCss(): string {
  const lines = ['@theme {'];
  for (const [key, hex] of Object.entries(palette)) lines.push(`  --color-${key}: ${hex};`);
  for (const name of semanticNames) lines.push(`  --color-${name}: var(--${name});`);
  lines.push(`  --font-display: ${font.display};`, `  --font-sans: ${font.sans};`);
  for (const [key, v] of Object.entries(radius)) lines.push(`  --radius-${key}: ${v};`);
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

export function buildWebCss(): string {
  return [
    `:root {\n${modeVars(light, '  ')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${modeVars(dark, '    ')}\n  }\n}`,
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${modeVars(dark, '  ')}\n}`,
  ]
    .join('\n\n')
    .concat('\n');
}

export function buildNativeCss(): string {
  return `@layer theme {\n  :root {\n    @variant light {\n${modeVars(light, '      ')}\n    }\n    @variant dark {\n${modeVars(dark, '      ')}\n    }\n  }\n}\n`;
}

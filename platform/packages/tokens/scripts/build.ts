import { mkdirSync, writeFileSync } from 'node:fs';
import { buildNativeCss, buildThemeCss, buildWebCss } from '../src/css';
import { dark, font, light, palette, radius, typeScale } from '../src/tokens';

const out = new URL('../dist/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('theme.css', out), buildThemeCss());
writeFileSync(new URL('web.css', out), buildWebCss());
writeFileSync(new URL('native.css', out), buildNativeCss());
writeFileSync(
  new URL('tokens.json', out),
  `${JSON.stringify({ palette, light, dark, font, radius, type: typeScale }, null, 2)}\n`,
);
console.log('tokens: wrote dist/theme.css, web.css, native.css, tokens.json');

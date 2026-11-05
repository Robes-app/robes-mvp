// Rasterises the tab glyphs for the native tab bar (iOS navigation redline, 2026-11-04): 24pt,
// 1.5 stroke, black on transparent at @1x/@2x/@3x. The tab bar draws them as template images, so
// its tint sets the colour. A manifest of the source paths lets a test catch drift.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ICON_STROKE_WIDTH, ICON_VIEWBOX, ICONS, TAB_ICONS } from '../src/icons';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../mobile/assets/tabs');
const PT = 24;
const SCALES = [1, 2, 3] as const;

function svg(name: (typeof TAB_ICONS)[number], px: number): string {
  const paths = ICONS[name].map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_VIEWBOX}" width="${px}" height="${px}" fill="none" stroke="#000" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

await mkdir(OUT, { recursive: true });
for (const name of TAB_ICONS) {
  for (const scale of SCALES) {
    const px = PT * scale;
    const file = join(OUT, `${name}${scale === 1 ? '' : `@${scale}x`}.png`);
    await sharp(Buffer.from(svg(name, px)))
      .resize(px, px)
      .png({ compressionLevel: 9 })
      .toFile(file);
  }
}
const manifest = Object.fromEntries(TAB_ICONS.map((n) => [n, ICONS[n]]));
await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`tab images: wrote ${TAB_ICONS.length * SCALES.length} PNGs to ${OUT}`);

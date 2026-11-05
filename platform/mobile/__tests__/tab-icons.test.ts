import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ICONS, TAB_ICONS } from '@robes/icons';

const DIR = join(__dirname, '../assets/tabs');

// The system tab bar draws template PNGs of the @robes/icons glyphs. If this fails, run
// `pnpm --filter @robes/icons gen:tab-images` and commit what it writes.
test('the tab images are drawn from the current glyphs', () => {
  const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
  expect(manifest).toEqual(Object.fromEntries(TAB_ICONS.map((n) => [n, ICONS[n]])));
});

test('each tab image is 24pt at @1x, @2x and @3x', () => {
  for (const name of TAB_ICONS) {
    for (const [suffix, px] of [
      ['', 24],
      ['@2x', 48],
      ['@3x', 72],
    ] as const) {
      const png = readFileSync(join(DIR, `${name}${suffix}.png`));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([px, px]);
    }
  }
});

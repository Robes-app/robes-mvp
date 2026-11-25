import { describe, expect, it } from 'vitest';
import { buildFrameRenderPrompt as v9Frame, buildRenderPrompt as v9Render } from './v9';
import { buildFrameRenderPrompt, buildRenderPrompt, VERSION, wornLine } from './v10';

const shirt = {
  name: 'Light blue oversized shirt',
  category: 'Tops',
  hasImage: true,
  shape: ['Oversized'],
  detail: 'Dropped shoulder',
  styled: 'untucked',
};
const skirt = { name: 'Cream midi skirt', category: 'Bottoms', hasImage: true };
const anchor = { face: true, figure: '' };

const lineOf = (p: string, name: string) => p.split('\n').find((l) => l.includes(name)) ?? '';

describe('avatar v10 (how it is worn wins over its photograph, 25 Nov)', () => {
  it('ends the piece’s garment line on how it is worn, overriding the photograph', () => {
    expect(VERSION).toBe(10);
    for (const p of [
      buildRenderPrompt('woman', [shirt, skirt]),
      buildFrameRenderPrompt('woman', [shirt, skirt], null, anchor),
    ]) {
      const line = lineOf(p, 'Light blue oversized shirt');
      expect(line.endsWith(wornLine('untucked'))).toBe(true);
      expect(line).toContain('This overrides how it is worn in its photograph');
      // The old mid-line note is gone, and only the shirt carries one.
      expect(p).not.toContain('Worn: untucked.');
      expect(p.match(/How it is worn in this look/g)).toHaveLength(1);
      expect(lineOf(p, 'Cream midi skirt')).not.toContain('How it is worn');
    }
  });

  it('comes after the shape and the defining detail', () => {
    const line = lineOf(buildRenderPrompt('woman', [shirt, skirt]), 'Light blue oversized shirt');
    expect(line.indexOf('Its shape:')).toBeLessThan(line.indexOf('How it is worn'));
    expect(line.indexOf('Its defining detail:')).toBeLessThan(line.indexOf('How it is worn'));
  });

  it('is v9 to the letter when no piece carries a styling note', () => {
    const { styled: _, ...plain } = shirt;
    expect(buildRenderPrompt('woman', [plain, skirt])).toBe(v9Render('woman', [plain, skirt]));
    expect(buildFrameRenderPrompt('woman', [plain, skirt], 'outdoors', anchor)).toBe(
      v9Frame('woman', [plain, skirt], 'outdoors', anchor),
    );
  });

  it('carries the same words v9 did, moved, for a note that needs cleaning', () => {
    const messy = { ...shirt, styled: `  left   out,\n sleeves rolled ${'x'.repeat(200)}` };
    const p = buildRenderPrompt('woman', [messy, skirt]);
    const said = `left out, sleeves rolled ${'x'.repeat(200)}`.slice(0, 120);
    expect(v9Render('woman', [messy, skirt])).toContain(`Worn: ${said}.`);
    expect(lineOf(p, 'Light blue oversized shirt').endsWith(wornLine(said))).toBe(true);
  });

  it('works for a piece with no photograph', () => {
    const p = buildRenderPrompt('woman', [{ ...shirt, hasImage: false }, skirt]);
    expect(lineOf(p, 'Light blue oversized shirt').endsWith(wornLine('untucked'))).toBe(true);
  });
});

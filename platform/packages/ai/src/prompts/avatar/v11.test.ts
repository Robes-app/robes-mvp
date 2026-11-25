import { describe, expect, it } from 'vitest';
import { buildFrameRenderPrompt as v10Frame, buildRenderPrompt as v10Render } from './v10';
import {
  buildFrameRenderPrompt,
  buildRenderPrompt,
  hasShoes,
  nothingUnlisted,
  VERSION,
} from './v11';

// Her look, 25 Nov: bare legs in thong sandals under a sheer skirt, drawn in black tights.
const blazer = { name: 'Grey oversized blazer', category: 'Outerwear', hasImage: true };
const skirt = { name: 'Black sheer skirt', category: 'Bottoms', hasImage: true };
const sandals = { name: 'Black thong sandals', category: 'Shoes', hasImage: true };
const look = [blazer, skirt, sandals];
const twin = { face: true, figure: 'a slim frame.' };
const anchor = { face: true, figure: '' };

describe('avatar v11 (nothing unlisted, 25 Nov)', () => {
  it('says exactly what may not be added, on both prompts, in place of "simple essentials"', () => {
    expect(VERSION).toBe(11);
    for (const p of [
      buildRenderPrompt('woman', look, twin),
      buildFrameRenderPrompt('woman', look, null, anchor),
      buildFrameRenderPrompt('woman', look, null, undefined),
    ]) {
      expect(p).not.toContain('simple essentials');
      expect(p).toContain('nothing extra:');
      expect(p).toContain(nothingUnlisted('woman', true));
      expect(p).toContain('No tights, stockings, leggings or socks unless one is listed');
      expect(p).toContain('her legs are bare');
      expect(p).not.toContain('plain, simple shoes');
    }
  });

  it('sits straight after the garment list, after the LAYERS line when there is one', () => {
    const shirt = { name: 'White poplin shirt', category: 'Tops', hasImage: true };
    const lines = buildRenderPrompt('woman', [shirt, ...look], twin).split('\n');
    const rule = lines.findIndex((l) => l.startsWith('NOTHING UNLISTED'));
    expect(lines[rule - 1]?.startsWith('LAYERS')).toBe(true);
    expect(lines[rule - 2]).toContain('Black thong sandals');

    const two = buildRenderPrompt('woman', [skirt, sandals], twin).split('\n');
    const at = two.findIndex((l) => l.startsWith('NOTHING UNLISTED'));
    expect(two[at - 1]).toContain('Black thong sandals');
  });

  it('is v10 with only the clause changed and the rule added', () => {
    const p = buildRenderPrompt('woman', look, twin, 'outdoors');
    const back = p
      .replace('nothing extra:', 'nothing extra beyond simple essentials:')
      .replace(`\n${nothingUnlisted('woman', true)}`, '');
    expect(back).toBe(v10Render('woman', look, twin, 'outdoors'));
    const f = buildFrameRenderPrompt('woman', look, null, anchor)
      .replace('nothing extra:', 'nothing extra beyond simple essentials:')
      .replace(`\n${nothingUnlisted('woman', true)}`, '');
    expect(f).toBe(v10Frame('woman', look, null, anchor));
  });

  it('lets her legwear be drawn when it is on the look', () => {
    const socks = { name: 'Black sheer socks', category: 'Accessories', hasImage: true };
    const p = buildRenderPrompt('woman', [...look, socks], twin);
    expect(p).toContain('- IMAGE 6: the Black sheer socks');
    expect(p).toContain('unless one is listed');
  });

  it('gives plain shoes only when the look has none', () => {
    const p = buildRenderPrompt('woman', [blazer, skirt], twin);
    expect(p).toContain(nothingUnlisted('woman', false));
    expect(p).toContain('give her plain, simple shoes');
  });

  it('reads shoes from the category or the name', () => {
    expect(hasShoes([sandals])).toBe(true);
    expect(hasShoes([{ name: 'Black knee-high heel boots', hasImage: false }])).toBe(true);
    expect(hasShoes([{ name: 'Cream canvas trainers', category: null, hasImage: true }])).toBe(
      true,
    );
    expect(hasShoes([blazer, skirt])).toBe(false);
  });

  it('speaks of him for a man', () => {
    const p = buildRenderPrompt('man', [blazer, sandals], twin);
    expect(p).toContain(nothingUnlisted('man', true));
    expect(p).toContain('below shorts his legs are bare');
  });

  it('leaves one piece on her base layer as v10 drew it', () => {
    expect(buildRenderPrompt('woman', [skirt], twin)).toBe(v10Render('woman', [skirt], twin));
  });
});

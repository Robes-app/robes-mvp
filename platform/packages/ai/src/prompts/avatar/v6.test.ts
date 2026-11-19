import { describe, expect, it } from 'vitest';
import { buildRenderPrompt as v4Render } from './v4';
import { buildFrameRenderPrompt as v5Frame } from './v5';
import { buildFrameRenderPrompt, buildRenderPrompt, layersLine, VERSION } from './v6';

const hoodie = { name: 'Pink cropped zip-up hoodie', category: 'Tops', hasImage: true };
const leggings = { name: 'Black active leggings', category: 'Bottoms', hasImage: true };
const coat = { name: 'Oversized wool-blend coat', category: 'Outerwear', hasImage: false };
const anchor = { face: false, figure: '' };

describe('avatar v6 (a coat is the outer layer, 19 Nov)', () => {
  it('is v5 and v4 byte for byte with no outerwear', () => {
    expect(VERSION).toBe(6);
    expect(buildFrameRenderPrompt('woman', [hoodie, leggings], null, anchor)).toBe(
      v5Frame('woman', [hoodie, leggings], null, anchor),
    );
    expect(buildRenderPrompt('woman', [hoodie, leggings])).toBe(
      v4Render('woman', [hoodie, leggings]),
    );
  });

  it('names the coat as the outer layer over the top, straight after the garment list', () => {
    const p = buildFrameRenderPrompt('woman', [hoodie, leggings, coat], null, anchor);
    const line =
      'LAYERS: the Oversized wool-blend coat is the outer layer, worn over the Pink cropped zip-up hoodie — clearly visible in the photograph, never left out.';
    expect(p).toContain(`- the Oversized wool-blend coat (Outerwear).\n${line}\n`);
    expect(p.replace(`${line}\n`, '')).toBe(
      v5Frame('woman', [hoodie, leggings, coat], null, anchor),
    );
    expect(buildRenderPrompt('woman', [hoodie, coat])).toContain(line);
  });

  it('reads with no top to go over, and with two layers', () => {
    expect(layersLine([coat, leggings])).toBe(
      'LAYERS: the Oversized wool-blend coat is the outer layer — clearly visible in the photograph, never left out.',
    );
    const blazer = { name: 'Navy blazer', category: 'Outerwear', hasImage: true };
    expect(layersLine([hoodie, blazer, coat])).toContain(
      'the Navy blazer and the Oversized wool-blend coat are the outer layers, worn over',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { buildRenderPrompt as v1 } from './v1';
import { buildFrameRenderPrompt, buildRenderPrompt, VERSION } from './v2';

const knit = { name: 'Cream knit', category: 'Tops', color: 'cream', brand: null, hasImage: true };
const jean = {
  name: 'Dark jean',
  category: 'Bottoms',
  color: 'indigo',
  brand: 'Agolde',
  hasImage: false,
};
const pieces = [knit, jean];

describe('avatar v2 (legacy 2026-10-01 styled notes, 2026-10-07 frame mode)', () => {
  it('is v1 byte for byte without styling notes', () => {
    expect(VERSION).toBe(2);
    expect(buildRenderPrompt('woman', pieces)).toBe(v1('woman', pieces));
    expect(buildRenderPrompt('man', pieces.slice(0, 1))).toBe(v1('man', pieces.slice(0, 1)));
  });

  it('says how a piece is worn on its line', () => {
    const p = buildRenderPrompt('woman', [{ ...knit, styled: 'tucked  at the front' }, jean]);
    expect(p).toContain(
      '- IMAGE 2: the Cream knit (cream Tops) — reproduce this exact garment faithfully: its true colour, cut, fabric and details. Worn: tucked at the front.',
    );
    expect(p).toContain('- the Dark jean (indigo Bottoms by Agolde).\n');
  });

  it('re-dresses the frame, keeping the scene', () => {
    const p = buildFrameRenderPrompt('woman', [{ ...jean, styled: 'cuffed once' }]);
    expect(p).toContain('IMAGE 1 is an existing photograph of this look');
    expect(p).toContain('this is the same photograph with the clothes changed, never a new scene');
    expect(p).toContain('- the Dark jean (indigo Bottoms by Agolde). Worn: cuffed once.');
    expect(p).not.toContain('studio backdrop');
  });
});

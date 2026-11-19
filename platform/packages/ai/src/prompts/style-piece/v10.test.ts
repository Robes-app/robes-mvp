import { describe, expect, it } from 'vitest';
import { buildImagePrompt as v8Image } from './v8';
import { buildImagePrompt, VERSION } from './v10';

const base = {
  wearer: 'woman' as const,
  mode: 'piece' as const,
  fallback: false,
  pieceLabel: 'Camel coat',
  hasModel: true,
  hasPiecePhoto: true,
  styleIcons: [],
  brief: null,
  way: { title: 'Garden party', eyebrow: 'Evening', scene: 'A long lunch in the sun.' },
  pieces: [
    { name: 'Silk shirt', category: 'Tops', color: 'ivory', brand: '', hasImage: true },
    { name: 'Black mules', category: 'Shoes', color: 'black', brand: '', hasImage: false },
  ],
};

describe('style-piece v10 (twin likeness, 17 Nov)', () => {
  it('is v8 byte for byte without her close-up or figure, or with no model', () => {
    expect(VERSION).toBe(10);
    expect(buildImagePrompt(base)).toBe(v8Image(base));
    const studio = { ...base, setting: 'studio' as const };
    expect(buildImagePrompt(studio)).toBe(v8Image(studio));
    const noModel = { ...base, hasModel: false };
    expect(buildImagePrompt({ ...noModel, hasFace: true, figure: 'a slim frame.' })).toBe(
      v8Image(noModel),
    );
  });

  it('puts her close-up second and moves the key piece and her pieces along, in a scene', () => {
    const p = buildImagePrompt({ ...base, hasFace: true, figure: 'a slim frame.' });
    expect(p).toContain('IMAGE 2 is a close-up photograph of the same person');
    expect(p).toContain('Her figure, as the first image shows it: a slim frame.');
    expect(p).toContain('IMAGE 3 shows the key piece only');
    expect(p).toContain('- IMAGE 4: the Silk shirt');
    expect(p).not.toContain('IMAGE 2 shows the key piece');
    // The close-up sits right after who she is.
    expect(p.indexOf('IMAGE 2 is a close-up')).toBeGreaterThan(
      p.indexOf('The FIRST image is the model'),
    );
  });

  it('does the same on her draft in the studio', () => {
    const p = buildImagePrompt({ ...base, setting: 'studio', hasFace: true, figure: '' });
    expect(p).toContain('IMAGE 2 is a close-up photograph of the same person');
    expect(p).toContain('IMAGE 3 shows the key piece only');
    expect(p).toContain('- IMAGE 4: the Silk shirt');
    expect(p).toContain('clean warm-grey studio backdrop');
    expect(p).not.toContain('figure, as the first image');
  });

  it('carries a figure alone without moving any image', () => {
    const p = buildImagePrompt({ ...base, figure: 'a fuller frame.' });
    expect(p).toContain('Her figure, as the first image shows it: a fuller frame.');
    expect(p).toContain('IMAGE 2 shows the key piece only');
    expect(p).toContain('- IMAGE 3: the Silk shirt');
  });
});

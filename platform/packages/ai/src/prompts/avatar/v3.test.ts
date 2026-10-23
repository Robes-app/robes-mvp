import { NO_ADJ, type TwinInputs, twinSpec } from '@robes/core/avatar';
import { describe, expect, it } from 'vitest';
import { buildRenderPrompt as v2 } from './v2';
import { buildRenderPrompt, buildTwinPrompt, twinFigureLine, VERSION } from './v3';

const her: TwinInputs = {
  gender: 'woman',
  facts: {
    heightCm: 178,
    sizeUk: 12,
    bustBand: null,
    bustCup: null,
    bustCm: 96,
    waistCm: 72,
    ageBand: '35_44',
  },
  adj: { ...NO_ADJ, hips: 2 },
  skin: 4,
  hair: 2,
  skinSet: false,
  hairSet: true,
  closeUpAssetId: 'a',
};
const knit = { name: 'Cream knit', category: 'Tops', color: 'cream', brand: null, hasImage: true };

describe('avatar v3 (the twin)', () => {
  it('describes her line in size and proportion words, never a weight', () => {
    const line = twinFigureLine(twinSpec(her, true));
    expect(VERSION).toBe(3);
    expect(line).toBe(
      'tall and long-limbed, an average frame, a full bust, very full, rounded hips, a clearly defined waist.',
    );
    expect(line).not.toMatch(/kg|weigh|lb/);
  });

  it('defaults to a woman, size 10, 35 and draws her face from the close-up', () => {
    const p = buildTwinPrompt(twinSpec(her, true));
    expect(p).toContain('IMAGE 1 is a photograph of this exact person');
    expect(p).toContain('Her skin tone exactly as in the photograph.');
    expect(p).toContain('Her hair is chestnut brown');
    expect(p).toContain('35 years old');
    const bare = buildTwinPrompt(
      twinSpec(
        {
          ...her,
          facts: { ...her.facts, sizeUk: null, ageBand: null, heightCm: null },
          closeUpAssetId: null,
        },
        false,
      ),
    );
    expect(bare).not.toContain('IMAGE 1');
    expect(bare).toContain('a slim frame');
    expect(bare).toContain('35 years old');
  });

  it('renders on a twin with the close-up as IMAGE 2 and the figure line', () => {
    expect(buildRenderPrompt('woman', [knit])).toBe(v2('woman', [knit]));
    const p = buildRenderPrompt('woman', [knit], { face: true, figure: 'a slim frame.' });
    expect(p).toContain('IMAGE 2 is a close-up photograph of the same person');
    expect(p).toContain('- IMAGE 3: the Cream knit');
    expect(p).toContain('Her figure, as IMAGE 1 shows it: a slim frame.');
    const noFace = buildRenderPrompt('woman', [knit], { face: false, figure: 'a slim frame.' });
    expect(noFace).toContain('- IMAGE 2: the Cream knit');
    expect(noFace).not.toContain('close-up');
  });
});

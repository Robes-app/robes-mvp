import { describe, expect, it } from 'vitest';
import { buildFrameRenderPrompt as v4Frame } from './v4';
import { buildFrameRenderPrompt, VERSION } from './v5';

const knit = { name: 'Cream knit', category: 'Tops', color: 'cream', brand: null, hasImage: true };
const jeans = { name: 'Straight jeans', category: 'Bottoms', color: 'indigo', hasImage: true };
const mules = { name: 'Black mules', category: 'Shoes', color: 'black', hasImage: false };

describe('avatar v5 (a re-dress keeps the person, 17 Nov)', () => {
  it('is v4 byte for byte without an anchor', () => {
    expect(VERSION).toBe(5);
    expect(buildFrameRenderPrompt('woman', [knit, mules])).toBe(v4Frame('woman', [knit, mules]));
    expect(buildFrameRenderPrompt('man', [knit], 'hair up')).toBe(
      v4Frame('man', [knit], 'hair up'),
    );
  });

  it('takes the person from the portrait and only the setting from the last picture', () => {
    const p = buildFrameRenderPrompt('woman', [knit, jeans, mules], null, {
      face: false,
      figure: '',
    });
    expect(p).toContain('IMAGE 1 is an existing photograph of this look');
    expect(p).toContain('IMAGE 2 is the reference portrait of the person in this photograph');
    expect(p).toContain('never from IMAGE 1');
    expect(p).toContain('older or younger');
    expect(p).toContain('do not age, idealise or retouch her');
    expect(p).toContain('Keep the SAME location, backdrop, light, time of day, pose and framing');
    expect(p).not.toContain('a faithful likeness of IMAGE 1');
    expect(p).not.toContain('IMAGE 3 is a close-up');
    // Her pieces follow the portrait.
    expect(p).toContain('- IMAGE 3: the Cream knit');
    expect(p).toContain('- IMAGE 4: the Straight jeans');
    expect(p).toContain('- the Black mules');
  });

  it('on her twin: her close-up as IMAGE 3, her figure, her pieces from IMAGE 4', () => {
    const p = buildFrameRenderPrompt('woman', [knit, jeans], 'sleeves rolled up', {
      face: true,
      figure: 'a slim frame, a full bust.',
    });
    expect(p).toContain('from IMAGE 2 and IMAGE 3');
    expect(p).toContain('IMAGE 3 is a close-up photograph of the same person');
    expect(p).toContain('Her figure, as IMAGE 2 shows it: a slim frame, a full bust.');
    expect(p).toContain('- IMAGE 4: the Cream knit');
    expect(p).toContain('- IMAGE 5: the Straight jeans');
    expect(p).toContain('<user_input>\nsleeves rolled up\n</user_input>');
    expect(p.endsWith('Generate the single photograph now.')).toBe(true);
  });

  it('speaks of him on a man’s model', () => {
    const p = buildFrameRenderPrompt('man', [knit], null, { face: true, figure: 'a slim build.' });
    expect(p).toContain(
      'Reproduce the man in IMAGE 2 exactly; do not age, idealise or retouch him.',
    );
    expect(p).toContain('His figure, as IMAGE 2 shows it');
  });
});

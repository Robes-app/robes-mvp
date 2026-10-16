import { describe, expect, it } from 'vitest';
import { buildCellPrompt, buildRenderPrompt, describeCell } from './v1';

describe('avatar prompts v1', () => {
  it('describes a cell from the catalog only', () => {
    expect(describeCell('w-s0-h4-pe-ll')).toBe(
      'She has deep espresso brown skin, long light ash blonde hair worn down, and a figure with hips gently fuller than her shoulders, with soft, curved lines.',
    );
    expect(describeCell('m-s7-h0-nt')).toMatch(
      /^He has fair cool porcelain skin, short jet black hair/,
    );
    expect(describeCell('not-a-cell')).toBeNull();
    expect(buildCellPrompt('x')).toBeNull();
  });

  it('builds the reference portrait on the seamless base layer', () => {
    const prompt = buildCellPrompt('w-s3-h1-nt') ?? '';
    expect(prompt).toContain('this is the reference portrait');
    expect(prompt).toContain('seamless base layer');
    expect(prompt).toContain('FULL-LENGTH FRAMING');
  });

  it('numbers photographed pieces after the model and describes the rest', () => {
    const prompt = buildRenderPrompt('woman', [
      { name: 'Camel coat', color: 'Camel', category: 'Outerwear', hasImage: true },
      { name: 'Loafers', hasImage: false },
    ]);
    expect(prompt).toContain('IMAGE 1 is the model');
    expect(prompt).toContain('- IMAGE 2: the Camel coat (Camel Outerwear)');
    expect(prompt).toContain('- the Loafers.');
    expect(prompt).toContain('every listed piece worn together');
  });
});

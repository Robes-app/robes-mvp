import { describe, expect, it } from 'vitest';
import legacy from './fixtures/legacy.json' with { type: 'json' };
import {
  BODIES,
  buildColorHarmony,
  buildSilhouette,
  classifyBody,
  classifySeason,
  SEASONS,
  styleDnaPromptBlock,
} from './index';

// Fixtures were produced by running legacy style_dna.js over these inputs: the port must match.
describe('style DNA matches legacy', () => {
  it.each(legacy.seasons)('classifySeason %#', ({ input, output }) => {
    expect(classifySeason(input)).toBe(output);
  });

  it('classifyBody over the ratio grid', () => {
    for (const { input, output } of legacy.bodies)
      expect(classifyBody(input), JSON.stringify(input)).toEqual(output);
  });

  it.each(legacy.harmony)('buildColorHarmony %#', ({ input, output }) => {
    expect(buildColorHarmony(input)).toEqual(output);
  });

  it.each(legacy.silhouette)('buildSilhouette %#', ({ input, output }) => {
    expect(buildSilhouette(input)).toEqual(output);
  });

  it.each(legacy.prompts)('styleDnaPromptBlock %#', ({ args, output }) => {
    const [dna, count, icons] = args as [unknown, number, unknown];
    expect(styleDnaPromptBlock(dna, count, icons)).toBe(output);
  });
});

describe('style DNA hardening', () => {
  it('covers every season and body the classifiers can return', () => {
    expect(Object.keys(SEASONS)).toHaveLength(12);
    expect(Object.keys(BODIES)).toHaveLength(5);
    for (const { output } of legacy.seasons) expect(SEASONS).toHaveProperty([output]);
  });

  it('never matches prototype keys from model output', () => {
    const { dna } = buildColorHarmony({ season: 'constructor', undertone: 'toString' });
    expect(dna.classification.source).toBe('primitive_mapping');
    expect(buildSilhouette({ body_shape: '__proto__' }).dna.classification.source).toBe(
      'ratio_thresholds',
    );
  });

  it('drops malformed stored fields instead of throwing (legacy crash vector)', () => {
    const block = styleDnaPromptBlock(
      {
        color_harmony: {
          archetype_name: 'Soft Autumn',
          functional_sub_palettes: { best_neutrals: 'oops' },
        },
        silhouette_proportions: { body_type: 'Pear', architectural_rules: { necklines: 42 } },
        user_overrides: { loved_colors: 'navy' },
      },
      2,
      'not a list',
    );
    expect(block).toContain('Colour archetype: Soft Autumn');
    expect(block).not.toContain('Foundation neutrals');
    expect(block).toContain('Best necklines: .');
  });
});

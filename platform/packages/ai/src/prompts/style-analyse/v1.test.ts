import { buildColorHarmony, buildSilhouette } from '@robes/core/style-dna';
import { describe, expect, it } from 'vitest';
import {
  COLOUR_PROMPT,
  ColourOutput,
  fakeColour,
  fakeSilhouette,
  SILHOUETTE_PROMPT,
  SilhouetteOutput,
} from './v1';

describe('style.analyse v1', () => {
  it('keeps the legacy protocols', () => {
    expect(COLOUR_PROMPT).toContain('12-season analysis');
    expect(COLOUR_PROMPT).toContain('DISCIPLINE RULES');
    expect(SILHOUETTE_PROMPT).toContain('THE 5 ARCHETYPES');
    expect(SILHOUETTE_PROMPT).toContain('mirror selfies');
  });

  it('fakes validate and compose into a profile', () => {
    expect(buildColorHarmony(ColourOutput.parse(fakeColour())).dna.archetype_name).toBe(
      'Soft Autumn',
    );
    expect(buildSilhouette(SilhouetteOutput.parse(fakeSilhouette())).dna.body_type).toBe(
      'Hourglass',
    );
  });

  it('rejects seasons and shapes outside the catalog', () => {
    expect(ColourOutput.safeParse({ ...fakeColour(), season: 'Deep Spring' }).success).toBe(false);
    expect(SilhouetteOutput.safeParse({ ...fakeSilhouette(), body_shape: 'Oval' }).success).toBe(
      false,
    );
  });
});

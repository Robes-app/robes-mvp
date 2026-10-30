import { describe, expect, it } from 'vitest';
import { onboardingAnswers } from './onboarding';

describe('onboarding answers', () => {
  it('keeps her order and drops repeats', () => {
    expect(
      onboardingAnswers({
        identity: 'unspecified',
        styles: ['Utility', 'Minimal', 'Utility'],
        brands: ['COS', 'cos', 'Barbour'],
        colours: { blacks: 1, pinks: -1 },
      }),
    ).toEqual({
      genderIdentity: 'unspecified',
      styleArchetypes: ['Utility', 'Minimal'],
      styleBrands: ['COS', 'Barbour'],
      colourFamilies: { blacks: 1, pinks: -1 },
    });
  });

  it('leaves out what she did not answer', () => {
    expect(onboardingAnswers({})).toEqual({
      genderIdentity: undefined,
      styleArchetypes: undefined,
      styleBrands: undefined,
      colourFamilies: undefined,
    });
  });
});

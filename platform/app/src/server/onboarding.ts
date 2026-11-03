import type { CompleteOnboardingInput } from '@robes/contracts';
import { cleanPalette } from '@robes/core/colour';
import type { OnboardingAnswers } from '@robes/db';

const dedupe = (list: readonly string[] | undefined): string[] | undefined =>
  list?.filter((n, i) => list.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);

// Getting to know you, as the profile stores it: her order kept, repeats dropped, only known
// colour families (twin of updateStyleDna's own cleaning).
export function onboardingAnswers(input: CompleteOnboardingInput): OnboardingAnswers {
  const colours = input.colours ? cleanPalette({ fam: input.colours }).fam : undefined;
  return {
    genderIdentity: input.identity,
    styleArchetypes: dedupe(input.styles),
    styleBrands: dedupe(input.brands),
    colourFamilies: colours as OnboardingAnswers['colourFamilies'],
  };
}

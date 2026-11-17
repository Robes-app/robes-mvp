import type { CompleteOnboardingInput, SaveOnboardingInput } from '@robes/contracts';
import { cleanPalette } from '@robes/core/colour';
import type { FirstRunProgress, OnboardingAnswers } from '@robes/db';

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

// The eight-step flow as she goes, as the profile stores it (cleaned as on the finish).
export function firstRunProgress(input: SaveOnboardingInput): FirstRunProgress {
  return {
    step: input.step,
    skipped: input.skipped,
    genderIdentity: input.identity,
    styleArchetypes: dedupe(input.styles),
    styleBrands: dedupe(input.brands),
  };
}

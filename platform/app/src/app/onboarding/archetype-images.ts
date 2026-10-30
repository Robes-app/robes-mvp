import { archetypeImageKeys, type StyleType } from '@robes/core/style-dna';

// The onboarding photographs, bundled in public/archetypes (twin: mobile
// features/onboarding/archetype-images.ts); archetype-images.test.ts proves every key has its file.
export function archetypeImages(
  type: StyleType,
  presence: string | null,
): { key: string; src: string }[] {
  return archetypeImageKeys(type, presence).map((key) => ({
    key,
    src: `/archetypes/${key}.webp`,
  }));
}

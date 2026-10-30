import { archetypeImageKeys, type StyleType } from '@robes/core/style-dna';
import type { ImageSourcePropType } from 'react-native';

// The onboarding photographs bundled in assets/archetypes (twin: app/src/app/onboarding/
// archetype-images.ts). Metro needs a literal require per file; a key without one shows the empty
// frame.
// shortcut: empty until the archetype photographs are cropped and filed (Drive, 30 Oct).
const FILED: Record<string, ImageSourcePropType> = {};

export function archetypeImages(
  type: StyleType,
  presence: string | null,
): { key: string; src: ImageSourcePropType | null }[] {
  return archetypeImageKeys(type, presence).map((key) => ({ key, src: FILED[key] ?? null }));
}

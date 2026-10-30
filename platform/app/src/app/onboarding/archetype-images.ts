import { archetypeImageKeys, type StyleType } from '@robes/core/style-dna';

// The onboarding photographs bundled in public/archetypes (twin: mobile
// features/onboarding/archetype-images.ts). A key without its file shows the empty frame.
// shortcut: empty until the archetype photographs are cropped and filed (Drive, 30 Oct).
const FILED = new Set<string>([]);

export function archetypeImages(
  type: StyleType,
  presence: string | null,
): { key: string; src: string | null }[] {
  return archetypeImageKeys(type, presence).map((key) => ({
    key,
    src: FILED.has(key) ? `/archetypes/${key}.webp` : null,
  }));
}

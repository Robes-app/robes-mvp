import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEED_WEARERS, STYLE_TYPES } from '@robes/core/style-dna';
import { describe, expect, it } from 'vitest';
import { archetypeImages } from './archetype-images';

const PUBLIC = fileURLToPath(new URL('../../../public', import.meta.url));

describe('archetype photographs', () => {
  it('bundles four for every archetype and wearer', () => {
    for (const type of STYLE_TYPES)
      for (const wearer of [...SEED_WEARERS, 'unspecified'])
        for (const { src } of archetypeImages(type, wearer))
          expect(existsSync(`${PUBLIC}${src}`), src).toBe(true);
  });
});

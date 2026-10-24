import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLOUR_MODEL_MIGRATION, colourModelSql } from './colour-model';
import { MATERIAL_MIGRATION, materialModelSql } from './material-model';
import { REFERENCE_MIGRATION, referenceDataSql } from './reference-data';

const migration = (name: string) =>
  readFileSync(new URL(`../../../../db/migrations/${name}`, import.meta.url), 'utf8');

describe('reference data migration', () => {
  it('is up to date with the TS sources (run gen:sql after editing them)', () => {
    expect(migration(REFERENCE_MIGRATION)).toBe(referenceDataSql());
  });

  it('generates the colour model migration from the shade list', () => {
    expect(migration(COLOUR_MODEL_MIGRATION)).toBe(colourModelSql());
  });

  it('generates the material migration from the material list', () => {
    expect(migration(MATERIAL_MIGRATION)).toBe(materialModelSql());
  });
});

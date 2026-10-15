import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCE_MIGRATION, referenceDataSql } from './reference-data';

describe('reference data migration', () => {
  it('is up to date with the TS sources (run gen:sql after editing them)', () => {
    const file = new URL(`../../../../db/migrations/${REFERENCE_MIGRATION}`, import.meta.url);
    expect(readFileSync(file, 'utf8')).toBe(referenceDataSql());
  });
});

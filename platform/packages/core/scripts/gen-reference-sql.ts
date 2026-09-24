import { writeFileSync } from 'node:fs';
import { REFERENCE_MIGRATION, referenceDataSql } from '../src/sql/reference-data';

const target = new URL(`../../../db/migrations/${REFERENCE_MIGRATION}`, import.meta.url);
writeFileSync(target, referenceDataSql());
console.log(`wrote db/migrations/${REFERENCE_MIGRATION}`);

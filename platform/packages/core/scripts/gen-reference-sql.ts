import { writeFileSync } from 'node:fs';
import { REFERENCE_MIGRATION, referenceDataSql } from '../src/sql/reference-data';

const target = new URL(`../../../supabase/migrations/${REFERENCE_MIGRATION}`, import.meta.url);
writeFileSync(target, referenceDataSql());
console.log(`wrote supabase/migrations/${REFERENCE_MIGRATION}`);

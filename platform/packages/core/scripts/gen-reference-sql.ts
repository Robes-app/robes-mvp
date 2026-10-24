import { writeFileSync } from 'node:fs';
import { COLOUR_MODEL_MIGRATION, colourModelSql } from '../src/sql/colour-model';
import { MATERIAL_MIGRATION, materialModelSql } from '../src/sql/material-model';
import { REFERENCE_MIGRATION, referenceDataSql } from '../src/sql/reference-data';

for (const [name, sql] of [
  [REFERENCE_MIGRATION, referenceDataSql()],
  [COLOUR_MODEL_MIGRATION, colourModelSql()],
  [MATERIAL_MIGRATION, materialModelSql()],
] as const) {
  writeFileSync(new URL(`../../../db/migrations/${name}`, import.meta.url), sql);
  console.log(`wrote db/migrations/${name}`);
}

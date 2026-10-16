import { assertMigration } from '../assert';
import {
  databaseUrl,
  LEGACY_FIXTURE_DB,
  legacyUrl,
  REHEARSAL_TARGET_DB,
  recreateDatabase,
} from '../db';
import { extract } from '../extract';
import { buildLegacyFixture } from '../legacy-fixture';
import { recreateTarget } from '../target';
import { transform } from '../transform';
import { print } from './args';

// pnpm migrate:rehearse — fresh target, extract, transform, assert. Without LEGACY_DATABASE_URL it
// rebuilds and uses the local fixture.
if (!process.env.LEGACY_DATABASE_URL) {
  await recreateDatabase(LEGACY_FIXTURE_DB);
  await buildLegacyFixture(databaseUrl(LEGACY_FIXTURE_DB));
}
const target = await recreateTarget(REHEARSAL_TARGET_DB);
const extracted = await extract(legacyUrl(), target);
const transformed = await transform(target);
const report = await assertMigration(target);
print({ extracted, transformed, assert: report });
if (!report.ok) process.exit(1);

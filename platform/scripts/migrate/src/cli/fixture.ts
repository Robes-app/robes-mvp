import { databaseUrl, LEGACY_FIXTURE_DB, recreateDatabase } from '../db';
import { buildLegacyFixture } from '../legacy-fixture';

// pnpm migrate:fixture — a throwaway local legacy database with the deterministic rows.
await recreateDatabase(LEGACY_FIXTURE_DB);
await buildLegacyFixture(databaseUrl(LEGACY_FIXTURE_DB));
console.log(`built ${LEGACY_FIXTURE_DB}`);

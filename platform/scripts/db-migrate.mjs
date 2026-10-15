import { adminServerUrl, dbmate, isLocal } from './lib/dbmate.mjs';

// Applies pending migrations as the admin role. In CI/deploy DATABASE_ADMIN_URL includes the db name;
// locally both the dev and the test database move together, so DB tests never see an old schema.
const urls = process.env.DATABASE_ADMIN_URL
  ? [process.env.DATABASE_ADMIN_URL]
  : [process.env.ROBES_DB_NAME ?? 'robes']
      .flatMap((base) => [base, `${base}_test`])
      .map((name) => `${adminServerUrl()}/${name}`);
for (const url of urls) {
  dbmate(isLocal(url) && !url.includes('sslmode') ? `${url}?sslmode=disable` : url, 'up');
}

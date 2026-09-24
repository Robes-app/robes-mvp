import { adminServerUrl, dbmate, isLocal } from './lib/dbmate.mjs';

// Local only: recreates the dev and test databases from db/migrations.
const server = adminServerUrl();
if (!isLocal(server)) {
  console.error('db:reset refuses to run against a non-local database.');
  process.exit(1);
}
for (const name of ['robes', 'robes_test']) {
  const url = `${server}/${name}?sslmode=disable`;
  dbmate(url, 'drop');
  dbmate(url, 'create');
  dbmate(url, 'up');
}

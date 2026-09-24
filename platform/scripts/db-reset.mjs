import { execFileSync } from 'node:child_process';

// Local only: recreates the dev and test databases from db/migrations.
const ADMIN = process.env.DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@127.0.0.1:55432';
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(ADMIN)) {
  console.error('db:reset refuses to run against a non-local database.');
  process.exit(1);
}
for (const name of ['robes', 'robes_test']) {
  const url = `${ADMIN}/${name}?sslmode=disable`;
  const run = (...args) =>
    execFileSync(
      'dbmate',
      ['--no-dump-schema', '--migrations-dir', 'db/migrations', '--url', url, ...args],
      {
        stdio: 'inherit',
      },
    );
  run('drop');
  run('create');
  run('up');
}

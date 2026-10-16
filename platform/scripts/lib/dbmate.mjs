import { execFileSync } from 'node:child_process';

export const LOCAL_ADMIN_URL = 'postgres://postgres:postgres@127.0.0.1:55432';

// The migration (admin) role URL without a database name; defaults to the local docker Postgres.
export function adminServerUrl() {
  const url = new URL(process.env.DATABASE_ADMIN_URL ?? LOCAL_ADMIN_URL);
  url.pathname = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

export function isLocal(url) {
  return /@(127\.0\.0\.1|localhost)[:/]/.test(url);
}

export function dbmate(databaseUrl, ...args) {
  execFileSync(
    'dbmate',
    ['--no-dump-schema', '--migrations-dir', 'db/migrations', '--url', databaseUrl, ...args],
    { stdio: 'inherit' },
  );
}

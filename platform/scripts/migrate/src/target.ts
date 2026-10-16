import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { databaseUrl, recreateDatabase } from './db';

const PLATFORM = fileURLToPath(new URL('../../../', import.meta.url));

// A fresh local target built from db/migrations, exactly as db:reset builds dev.
export async function recreateTarget(name: string): Promise<string> {
  await recreateDatabase(name);
  const url = databaseUrl(name);
  execFileSync(
    'pnpm',
    ['exec', 'dbmate', '--no-dump-schema', '--migrations-dir', 'db/migrations', '--url', url, 'up'],
    { cwd: PLATFORM, stdio: 'pipe' },
  );
  return url;
}

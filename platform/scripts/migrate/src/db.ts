import pg from 'pg';

// Calendar dates stay text end to end: pg would turn them into local-midnight Dates and shift days.
pg.types.setTypeParser(pg.types.builtins.DATE, (v: string) => v);

// Same default and guard as scripts/lib/dbmate.mjs: the local docker Postgres.
export const LOCAL_ADMIN_URL = 'postgres://postgres:postgres@127.0.0.1:55432';

export function adminServerUrl(): string {
  const url = new URL(process.env.DATABASE_ADMIN_URL ?? LOCAL_ADMIN_URL);
  url.pathname = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

export function isLocal(url: string): boolean {
  return /@(127\.0\.0\.1|localhost)[:/]/.test(url);
}

// Rehearsal tooling only ever creates, drops or writes local databases (docs/migration.md §3).
export function assertLocal(url: string, what: string): void {
  if (!isLocal(url)) throw new Error(`${what} refuses to run against a non-local database`);
}

export function databaseUrl(name: string): string {
  return `${adminServerUrl()}/${name}?sslmode=disable`;
}

export async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url, application_name: 'robes-migrate' });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function onServer(name: string, sql: (db: string) => string[]): Promise<void> {
  const server = adminServerUrl();
  assertLocal(server, 'rehearsal databases');
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`invalid database name ${name}`);
  await withClient(`${server}/postgres?sslmode=disable`, async (c) => {
    for (const statement of sql(name)) await c.query(statement);
  });
}

export function recreateDatabase(name: string): Promise<void> {
  return onServer(name, (db) => [
    `drop database if exists ${db} with (force)`,
    `create database ${db}`,
  ]);
}

export function dropDatabase(name: string): Promise<void> {
  return onServer(name, (db) => [`drop database if exists ${db} with (force)`]);
}

// The legacy source and the rehearsal target; both local, namespaced by ROBES_DB_NAME for worktrees.
const NS = process.env.ROBES_DB_NAME ?? 'robes';
export const LEGACY_FIXTURE_DB = `${NS}_legacy_fixture`;
export const REHEARSAL_TARGET_DB = `${NS}_migrate`;

export function legacyUrl(): string {
  return process.env.LEGACY_DATABASE_URL ?? databaseUrl(LEGACY_FIXTURE_DB);
}

// The cutover run (docs/migration.md §4, runbooks/production-release.md): a non-local target needs
// three things that can't line up by accident — the admin URL in TARGET_DATABASE_URL, the explicit
// `--target=production` flag on the command, and the operator typing the target's exact host into
// ROBES_MIGRATE_PRODUCTION. A stale env var alone, or a flag on a local run, refuses.
function targetFlag(argv: readonly string[]): string | undefined {
  const hit = argv.find((a) => a === '--target' || a.startsWith('--target='));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : '';
}

export function targetUrl(
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
): string {
  const url = env.TARGET_DATABASE_URL ?? databaseUrl(REHEARSAL_TARGET_DB);
  const target = targetFlag(argv);
  if (target !== undefined && target !== 'production') {
    throw new Error(`unknown --target=${target}; the only named target is --target=production`);
  }
  if (isLocal(url)) {
    if (target === 'production') {
      throw new Error(
        '--target=production given but TARGET_DATABASE_URL is local (or unset); set it to the production admin URL',
      );
    }
    return url;
  }
  const host = new URL(url).hostname;
  if (target !== 'production') {
    throw new Error(
      `migration target ${host} is not local; a production run needs --target=production (docs/runbooks/production-release.md)`,
    );
  }
  if (env.ROBES_MIGRATE_PRODUCTION !== host) {
    throw new Error(
      `migration target ${host} is not local; set ROBES_MIGRATE_PRODUCTION=${host} to confirm the cutover run`,
    );
  }
  return url;
}

// One line on stderr naming where a CLI is about to write, so the operator sees it before it runs.
export function announceTarget(url: string): void {
  const where = isLocal(url) ? 'local rehearsal' : 'PRODUCTION';
  const u = new URL(url);
  process.stderr.write(`robes-migrate → ${where}: ${u.hostname}${u.pathname}\n`);
}

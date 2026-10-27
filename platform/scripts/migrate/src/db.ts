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

// A remote run (docs/migration.md §4, runbooks/production-release.md) needs three things that can't
// line up by accident: the admin URL in TARGET_DATABASE_URL, a named `--target=production|staging`
// on the command, and the operator typing the target's identity into ROBES_MIGRATE_<TARGET>. A
// stale env var alone, or a flag on a local run, refuses.
const NAMED_TARGETS = ['production', 'staging'];

function targetFlag(argv: readonly string[]): string | undefined {
  const hit = argv.find((a) => a === '--target' || a.startsWith('--target='));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : '';
}

// What an operator types to confirm a remote target: user@host. Supabase's shared pooler gives every
// project the same host; only the user (`postgres.<project-ref>`) tells staging from production.
export function targetId(url: string): string {
  const u = new URL(url);
  return `${decodeURIComponent(u.username)}@${u.hostname}`;
}

export function targetUrl(
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
): string {
  const url = env.TARGET_DATABASE_URL ?? databaseUrl(REHEARSAL_TARGET_DB);
  const target = targetFlag(argv);
  if (target !== undefined && !NAMED_TARGETS.includes(target)) {
    throw new Error(
      `unknown --target=${target}; the named targets are --target=production and --target=staging`,
    );
  }
  if (isLocal(url)) {
    if (target) {
      throw new Error(
        `--target=${target} given but TARGET_DATABASE_URL is local (or unset); set it to the ${target} admin URL`,
      );
    }
    return url;
  }
  const id = targetId(url);
  if (!target) {
    throw new Error(
      `migration target ${id} is not local; a remote run needs --target=production or --target=staging (docs/runbooks/production-release.md)`,
    );
  }
  const confirmVar = `ROBES_MIGRATE_${target.toUpperCase()}`;
  if (env[confirmVar] !== id) {
    throw new Error(
      `migration target ${id} is not local; set ${confirmVar}=${id} to confirm the ${target} run`,
    );
  }
  return url;
}

// One line on stderr naming where a CLI is about to write, so the operator sees it before it runs.
export function announceTarget(url: string, argv: readonly string[] = process.argv): void {
  const where = isLocal(url) ? 'local rehearsal' : (targetFlag(argv) ?? 'remote').toUpperCase();
  process.stderr.write(`robes-migrate → ${where}: ${targetId(url)}${new URL(url).pathname}\n`);
}

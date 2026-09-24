import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { DB } from './database.types';

export type Db = Kysely<DB>;

export interface DbOptions {
  connectionString: string;
  max?: number;
  applicationName?: string;
}

export function createDb(opts: DbOptions): Db {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 5,
    application_name: opts.applicationName ?? 'robes',
    idleTimeoutMillis: 10_000,
  });
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  }).withSchema('app');
}

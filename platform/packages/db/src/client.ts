import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { DB } from './database.types';
import { tlsFor } from './tls';

export type Db = Kysely<DB>;

export interface DbOptions {
  connectionString: string;
  max?: number;
  applicationName?: string;
}

export function createDb(opts: DbOptions): Db {
  const pool = new pg.Pool({
    ...tlsFor(opts.connectionString),
    max: opts.max ?? 5,
    application_name: opts.applicationName ?? 'robes',
    idleTimeoutMillis: 10_000,
  });
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
    // Columns map snake↔camel; jsonb values stay exactly as stored (style DNA keeps snake_case).
    plugins: [new CamelCasePlugin({ maintainNestedObjectKeys: true })],
  }).withSchema('app');
}

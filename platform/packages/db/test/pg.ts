import pg from 'pg';
import { afterAll, expect } from 'vitest';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes_test';

const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 4 });
afterAll(() => pool.end());

export type Query = <R extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<R[]>;

// Runs a test body in a transaction that is always rolled back.
export async function inTx(body: (q: Query) => Promise<void>): Promise<void> {
  const client = await pool.connect();
  const q: Query = async (text, values) => (await client.query(text, values)).rows;
  try {
    await client.query('begin');
    await body(q);
  } finally {
    await client.query('rollback');
    client.release();
  }
}

// Asserts a statement fails with the given SQLSTATE without aborting the surrounding transaction.
export async function expectPgError(q: Query, code: string, text: string, values?: unknown[]) {
  await q('savepoint expect_error');
  let caught: unknown;
  try {
    await q(text, values);
  } catch (err) {
    caught = err;
  }
  await q('rollback to savepoint expect_error');
  expect((caught as { code?: string } | undefined)?.code, text).toBe(code);
}

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';

export async function insertUsers(q: Query, ...ids: string[]): Promise<void> {
  for (const id of ids) {
    await q('insert into app.users (id, name, email) values ($1, $2, $3)', [
      id,
      'Ann Lee',
      `${id}@test.dev`,
    ]);
  }
}

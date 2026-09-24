import { randomUUID } from 'node:crypto';
import { createDb, type Db } from '../src/client';
import { type UserId, verifiedUserId } from '../src/ids';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://robes_app:robes_app_local@127.0.0.1:55432/robes_test';

export function createTestDb(): Db {
  return createDb({ connectionString: TEST_DATABASE_URL, max: 4, applicationName: 'robes-test' });
}

// Creates a real user (profile rows come from the signup trigger); delete it to clean up.
export async function createTestUser(db: Db, name = 'Ann Lee'): Promise<UserId> {
  const id = randomUUID();
  await db
    .insertInto('users')
    .values({ id, name, email: `${id}@test.dev` })
    .execute();
  return verifiedUserId(id);
}

export async function deleteTestUsers(db: Db, ...ids: string[]): Promise<void> {
  if (ids.length > 0) await db.deleteFrom('users').where('id', 'in', ids).execute();
}

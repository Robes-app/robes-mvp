import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { accountDeletion } = createSystemRepositories(db);
let keep: UserId;

beforeAll(async () => {
  keep = await createTestUser(db);
  // Other suites' leftover requests would be claimed first; this suite owns the queue.
  await db.deleteFrom('accountDeletionRequests').execute();
});
afterAll(async () => {
  await deleteTestUsers(db, keep);
  await db.destroy();
});

describe('account deletion (SEC-80)', () => {
  it('claims a request once, then deletes the user and everything that cascades', async () => {
    const gone = await createTestUser(db);
    await repos.wardrobe.create(gone, { label: 'Coat' });
    await repos.wardrobe.create(keep, { label: 'Keep me' });
    await repos.deletion.request(gone);

    expect(await accountDeletion.claimNext()).toBe(gone);
    expect(await accountDeletion.claimNext()).toBeUndefined();
    await accountDeletion.complete(gone, { objects: 3 });

    const user = await db
      .selectFrom('users')
      .select('id')
      .where('id', '=', gone)
      .executeTakeFirst();
    expect(user).toBeUndefined();
    const pieces = await db
      .selectFrom('wardrobeItems')
      .select('id')
      .where('userId', '=', gone)
      .execute();
    expect(pieces).toEqual([]);
    expect(await repos.deletion.get(gone)).toBeUndefined();
    const audit = await db
      .selectFrom('auditLog')
      .select(['action', 'detail'])
      .where('subjectId', '=', gone)
      .executeTakeFirstOrThrow();
    expect(audit).toEqual({ action: 'account.deleted', detail: { objects: 3 } });
    expect((await repos.wardrobe.list(keep, { limit: 5 })).items).toHaveLength(1);
  });

  it('retries a failed or stuck run after 15 minutes', async () => {
    const user = await createTestUser(db);
    await repos.deletion.request(user);
    expect(await accountDeletion.claimNext()).toBe(user);
    await accountDeletion.fail(user, 'storage down');
    expect(await accountDeletion.claimNext()).toBeUndefined();
    // updated_at is trigger-maintained, so the window is shrunk instead of the clock moved.
    expect(await accountDeletion.claimNext({ retryAfterMinutes: 0 })).toBe(user);
    await accountDeletion.complete(user, {});
  });
});

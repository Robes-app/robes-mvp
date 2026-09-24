import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, mintShareToken } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { shares, publicShares, looks } = createRepositories(db);
let ann: UserId;
let bea: UserId;
let lookId: string;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
  lookId = (await looks.create(ann, { name: 'Gallery', nameProvisional: false, pieces: [] })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('shares', () => {
  it('mints 128-bit url-safe tokens', () => {
    const token = mintShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(mintShareToken()).not.toBe(token);
  });

  it('returns the same link when a look is shared again, until revoked', async () => {
    const first = await shares.create(ann, {
      subjectType: 'look',
      subjectId: lookId,
      snapshot: { name: 'Gallery' },
    });
    const again = await shares.create(ann, {
      subjectType: 'look',
      subjectId: lookId,
      snapshot: { name: 'Changed' },
    });
    expect(first.created).toBe(true);
    expect(again).toMatchObject({ token: first.token, created: false });

    const viewed = await publicShares.view(first.token);
    expect(viewed).toMatchObject({ subjectType: 'look', snapshot: { name: 'Gallery' } });
    expect(await shares.revoke(bea, first.token)).toBe(false);
    expect(await shares.revoke(ann, first.token)).toBe(true);
    expect(await publicShares.view(first.token)).toBeUndefined();

    const fresh = await shares.create(ann, {
      subjectType: 'look',
      subjectId: lookId,
      snapshot: { name: 'Gallery' },
    });
    expect(fresh.token).not.toBe(first.token);
  });

  it('counts views and never resolves an unknown token', async () => {
    const { token } = await shares.create(bea, {
      subjectType: 'look',
      subjectId: lookId,
      snapshot: {},
    });
    await publicShares.view(token);
    await publicShares.view(token);
    const row = await db
      .selectFrom('shares')
      .select('viewCount')
      .where('token', '=', token)
      .executeTakeFirstOrThrow();
    expect(row.viewCount).toBe(2);
    expect(await publicShares.view(mintShareToken())).toBeUndefined();
  });
});

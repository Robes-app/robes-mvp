import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { pushTokens } = createRepositories(db);
const { pushDelivery } = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;
const token = () => `ExponentPushToken[${crypto.randomUUID()}]`;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('push tokens', () => {
  it('registers idempotently and keeps tokens to their owner', async () => {
    const t = token();
    await pushTokens.register(ann, { expoToken: t, platform: 'ios', appVersion: '1.0.0' });
    await pushTokens.register(ann, { expoToken: t, platform: 'ios', appVersion: '1.0.1' });
    expect((await pushTokens.active(ann)).map((r) => r.expoToken)).toEqual([t]);
    expect(await pushTokens.active(bea)).toEqual([]);
    expect(await pushTokens.revoke(bea, t)).toBe(false);
    expect(await pushTokens.active(ann)).toHaveLength(1);
  });

  it('moves a token to whoever signs in on the device next', async () => {
    const t = token();
    await pushTokens.register(ann, { expoToken: t, platform: 'android' });
    await pushTokens.register(bea, { expoToken: t, platform: 'android' });
    expect((await pushTokens.active(ann)).map((r) => r.expoToken)).not.toContain(t);
    expect((await pushTokens.active(bea)).map((r) => r.expoToken)).toContain(t);
  });

  it('revokes on sign-out, re-activates on register, and drops dead devices', async () => {
    const t = token();
    await pushTokens.register(ann, { expoToken: t, platform: 'ios' });
    expect(await pushTokens.revoke(ann, t)).toBe(true);
    expect(await pushTokens.revoke(ann, t)).toBe(false);
    expect((await pushDelivery.activeFor([ann])).map((r) => r.expoToken)).not.toContain(t);
    await pushTokens.register(ann, { expoToken: t, platform: 'ios' });
    expect((await pushDelivery.activeFor([ann])).map((r) => r.expoToken)).toContain(t);
    await pushDelivery.revokeTokens([t]);
    expect((await pushTokens.active(ann)).map((r) => r.expoToken)).not.toContain(t);
  });
});

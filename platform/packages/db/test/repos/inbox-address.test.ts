import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QuotaExceeded } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories, mintInboxAddress } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { inboxAddress, inbox } = createRepositories(db);
const { inboxIntake } = createSystemRepositories(db);
let niall: UserId;
let bea: UserId;

beforeAll(async () => {
  niall = await createTestUser(db, 'Niall Maher');
  bea = await createTestUser(db, 'Bea Jones');
});
afterAll(async () => {
  await deleteTestUsers(db, niall, bea);
  await db.destroy();
});

const receipt = (providerId: string) => ({
  providerId,
  retailer: 'Sézane',
  orderRef: 'SZ-1',
  subject: 'Your order',
  fromEmail: 'niall@test.dev',
  items: [{ label: 'Camel wool coat', brand: 'Sézane', price: 340, currency: 'EUR' }],
});

describe('inbox addresses', () => {
  it('mints unguessable addresses that match the schema', () => {
    const a = mintInboxAddress();
    expect(a).toMatch(/^[a-z0-9]{20}$/);
    expect(mintInboxAddress()).not.toBe(a);
  });

  it('mints once, resolves to its owner, and stops working when regenerated or revoked', async () => {
    const first = await inboxAddress.ensure(niall);
    expect((await inboxAddress.ensure(niall)).address).toBe(first.address);
    expect(await inboxIntake.userForAddress(first.address.toUpperCase())).toBe(niall);
    expect(await inboxAddress.current(bea)).toBeUndefined();

    const next = await inboxAddress.regenerate(niall);
    expect(next.address).not.toBe(first.address);
    expect(await inboxIntake.userForAddress(first.address)).toBeUndefined();
    expect(await inboxIntake.userForAddress(next.address)).toBe(niall);

    expect(await inboxAddress.revoke(niall)).toBe(true);
    expect(await inboxIntake.userForAddress(next.address)).toBeUndefined();
    expect((await inboxAddress.ensure(niall)).address).not.toBe(next.address);
  });
});

describe('receipt intake', () => {
  it('holds one row per inbound message, private to its owner', async () => {
    const providerId = `ses:${randomUUID()}`;
    const first = await inboxIntake.fromReceipt(niall, receipt(providerId));
    const again = await inboxIntake.fromReceipt(niall, receipt(providerId));
    expect(first.created).toBe(true);
    expect(again).toEqual({ id: first.id, created: false });
    expect(await inboxIntake.hasProvider(providerId)).toBe(true);
    const row = await inbox.get(niall, first.id);
    expect(row).toMatchObject({ source: 'receipt', retailer: 'Sézane', status: 'held' });
    expect(await inbox.get(bea, first.id)).toBeUndefined();
  });

  it('charges the inbox.receipt quota and refuses past it', async () => {
    const user = await createTestUser(db, 'Cat Quota');
    await db
      .insertInto('usageCounters')
      .values({
        userId: user,
        metric: 'inbox.receipt',
        periodStart: new Date(new Date().toISOString().slice(0, 10)),
        count: 50,
      })
      .execute();
    await expect(
      inboxIntake.fromReceipt(user, receipt(`ses:${randomUUID()}`)),
    ).rejects.toBeInstanceOf(QuotaExceeded);
    await deleteTestUsers(db, user);
  });
});

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { inbox, wardrobe, wishlist } = createRepositories(db);
const { inboxIntake } = createSystemRepositories(db);
let niall: UserId;
let bea: UserId;

const item = (label: string) => ({
  label,
  brand: 'Toteme',
  price: 450,
  currency: 'EUR',
  imageUrl: 'https://shop.test/coat.jpg',
  sourceUrl: 'https://shop.test/coat',
});
const held = (user: UserId, label = 'Wool coat') =>
  inboxIntake.fromLink(user, {
    jobId: randomUUID(),
    retailer: 'shop.test',
    subject: label,
    item: item(label),
  });

beforeAll(async () => {
  niall = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, niall, bea);
  await db.destroy();
});

describe('inbox repo', () => {
  it('keeps each person’s inbox to themselves', async () => {
    const id = await held(niall);
    expect((await inbox.listHeld(niall)).map((r) => r.id)).toContain(id);
    expect(await inbox.countHeld(niall)).toBeGreaterThan(0);
    expect(await inbox.get(bea, id)).toBeUndefined();
    expect(await inbox.listHeld(bea)).toEqual([]);
    expect(await inbox.decide(bea, id, 'wardrobe')).toBeUndefined();
    expect((await inbox.get(niall, id))?.status).toBe('held');
  });

  it('files an item as a piece once, however often it is asked', async () => {
    const id = await held(niall, 'Silk shirt');
    const filed = await inbox.decide(niall, id, 'wardrobe');
    expect(filed).toMatchObject({ status: 'filed', filedTo: 'wardrobe' });
    expect(filed?.filedIds).toHaveLength(1);
    const again = await inbox.decide(niall, id, 'wishlist');
    expect(again?.filedIds).toEqual(filed?.filedIds);
    const piece = await wardrobe.get(niall, filed?.filedIds[0] ?? '');
    expect(piece).toMatchObject({ label: 'Silk shirt', brand: 'Toteme', acquiredVia: 'url' });
  });

  it('files to the wishlist with the link kept, or dismisses without filing', async () => {
    const id = await held(niall, 'Loafers');
    const filed = await inbox.decide(niall, id, 'wishlist');
    const wish = await wishlist.get(niall, filed?.filedIds[0] ?? '');
    expect(wish).toMatchObject({ label: 'Loafers', sourceUrl: 'https://shop.test/coat' });

    const other = await held(niall, 'Scarf');
    expect(await inbox.decide(niall, other, 'dismiss')).toMatchObject({
      status: 'dismissed',
      filedIds: [],
    });
  });

  it('files only the chosen items', async () => {
    const id = await held(niall, 'Belt');
    expect((await inbox.decide(niall, id, 'wardrobe', []))?.filedIds).toEqual([]);
  });

  it('dedupes a retried import by its job', async () => {
    const jobId = randomUUID();
    const a = await inboxIntake.fromLink(niall, {
      jobId,
      retailer: null,
      subject: null,
      item: item('Bag'),
    });
    const b = await inboxIntake.fromLink(niall, {
      jobId,
      retailer: null,
      subject: null,
      item: item('Bag'),
    });
    expect(a).toBe(b);
  });
});

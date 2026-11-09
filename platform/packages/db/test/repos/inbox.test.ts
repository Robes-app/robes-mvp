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

const receipt = (user: UserId, labels: string[]) =>
  inboxIntake.fromReceipt(user, {
    providerId: `ses:${randomUUID()}`,
    retailer: 'Sézane',
    orderRef: null,
    subject: 'Your order',
    fromEmail: 'orders@sezane.test',
    items: labels.map((l) => item(l)),
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
    const { id } = await receipt(niall, ['Wool coat']);
    expect((await inbox.listHeld(niall)).map((r) => r.id)).toContain(id);
    expect(await inbox.piecesWaiting(niall)).toBeGreaterThan(0);
    expect(await inbox.get(bea, id)).toBeUndefined();
    expect(await inbox.getHeld(bea, id)).toBeUndefined();
    expect(await inbox.listHeld(bea)).toEqual([]);
    expect(await inbox.piecesWaiting(bea)).toBe(0);
    expect(await inbox.decide(bea, id, 'wardrobe')).toBeUndefined();
    expect((await inbox.get(niall, id))?.status).toBe('held');
  });

  it('lists and counts receipts only: a pasted link waits for Review, not the Inbox', async () => {
    const dana = await createTestUser(db);
    try {
      const link = await held(dana, 'Silk slip dress');
      expect(await inbox.listHeld(dana)).toEqual([]);
      expect(await inbox.piecesWaiting(dana)).toBe(0);
      // Review still opens the link by its id, until it is decided.
      expect((await inbox.getHeld(dana, link))?.source).toBe('link');
      expect(await inbox.getHeld(niall, link)).toBeUndefined();

      const { id } = await receipt(dana, ['Camel coat', 'Silk scarf', 'Loafers']);
      expect((await inbox.listHeld(dana)).map((r) => r.id)).toEqual([id]);
      // The count is the pieces she will tick through, not the receipts.
      expect(await inbox.piecesWaiting(dana)).toBe(3);

      await inbox.decide(dana, link, 'wishlist');
      expect(await inbox.getHeld(dana, link)).toBeUndefined();
      await inbox.decide(dana, id, 'dismiss');
      expect(await inbox.piecesWaiting(dana)).toBe(0);
    } finally {
      await deleteTestUsers(db, dana);
    }
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

  // The Receipts' tabs (Front Door PRD rev 3 §7.5): each piece decided on its own.
  it('decides a receipt piece by piece: the rest keep waiting, the tabs count each state', async () => {
    const dana = await createTestUser(db);
    try {
      const { id } = await receipt(dana, ['Camel coat', 'Silk scarf', 'Loafers']);
      expect(await inbox.counts(dana)).toEqual({ inbox: 3, added: 0, discarded: 0 });
      // ✓ on the coat alone: it is added; the scarf and loafers still wait; the row is held.
      const first = await inbox.decide(dana, id, 'wardrobe', [0]);
      expect(first).toMatchObject({ status: 'held', filedTo: 'wardrobe' });
      expect(first?.filedIds).toHaveLength(1);
      const items = (first?.items ?? []) as { state?: string; filedId?: string }[];
      expect(items.map((i) => i.state ?? 'inbox')).toEqual(['added', 'inbox', 'inbox']);
      expect(items[0]?.filedId).toBe((first?.filedIds ?? [])[0]);
      expect(await inbox.counts(dana)).toEqual({ inbox: 2, added: 1, discarded: 0 });
      expect((await inbox.list(dana, 'inbox')).map((r) => r.id)).toEqual([id]);
      expect((await inbox.list(dana, 'added')).map((r) => r.id)).toEqual([id]);
      expect(await inbox.list(dana, 'discarded')).toEqual([]);
      // × on the scarf: discarded; the same coat asked again files nothing twice.
      const second = await inbox.decide(dana, id, 'dismiss', [0, 1]);
      expect(second?.filedIds).toHaveLength(1);
      expect((second?.items as { state?: string }[]).map((i) => i.state ?? 'inbox')).toEqual([
        'added',
        'discarded',
        'inbox',
      ]);
      expect(await inbox.counts(dana)).toEqual({ inbox: 1, added: 1, discarded: 1 });
      // The group's ✓ takes every piece still waiting; nothing waits, so the row is filed.
      const last = await inbox.decide(dana, id, 'wardrobe');
      expect(last).toMatchObject({ status: 'filed' });
      expect(last?.filedIds).toHaveLength(2);
      expect(last?.decidedAt).not.toBeNull();
      expect(await inbox.counts(dana)).toEqual({ inbox: 0, added: 2, discarded: 1 });
      expect(await inbox.piecesWaiting(dana)).toBe(0);
      expect(await inbox.list(dana, 'inbox')).toEqual([]);
      // Nobody else sees the tabs' counts.
      expect(await inbox.counts(bea)).toEqual({ inbox: 0, added: 0, discarded: 0 });
    } finally {
      await deleteTestUsers(db, dana);
    }
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

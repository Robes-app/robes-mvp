import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories, lineFields } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { inbox, wardrobe, wishlist } = createRepositories(db);
const { inboxIntake, jobs: runner } = createSystemRepositories(db);
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

  // A Zara receipt prints the size (beta's review row): it shows in the Inbox and travels onto
  // the piece she accepts, with the category and colour the read found.
  it('files a receipt line with its size, category and colour', async () => {
    const { id } = await inboxIntake.fromReceipt(niall, {
      providerId: `ses:${randomUUID()}`,
      retailer: 'Zara',
      orderRef: null,
      subject: 'Your order',
      fromEmail: 'orders@zara.test',
      items: [
        {
          ...item('Black flare leggings'),
          size: '6/7 years (122 cm)',
          categoryL2: 'Trousers',
          categoryL3: 'Leggings',
          color: 'Black',
        },
        { ...item('Bordeaux active leggings'), size: '6/7 years (122 cm)' },
      ],
    });
    const added = await inbox.decide(niall, id, 'wardrobe', [0]);
    const piece = await wardrobe.get(niall, added?.filedIds[0] ?? '');
    expect(piece).toMatchObject({
      label: 'Black flare leggings',
      size: '6/7 years (122 cm)',
      category: 'Bottoms',
      categoryL2: 'Trousers',
      categoryL3: 'Leggings',
      acquiredVia: 'receipt',
    });
    expect(piece?.colourShade).not.toBeNull();
    const wished = await inbox.decide(niall, id, 'wishlist', [1]);
    const wish = await wishlist.get(niall, wished?.filedIds.at(-1) ?? '');
    expect(wish).toMatchObject({ label: 'Bordeaux active leggings', size: '6/7 years (122 cm)' });
  });

  // Receipt photos (legacy visionPass, SEC-40): a receipt_read job per line with a photo, its bytes
  // stored into a pending asset of hers, and the photo deciding what the piece is.
  it('queues one photo read per waiting line with a photo, once, and only for her', async () => {
    const { id } = await inboxIntake.fromReceipt(niall, {
      providerId: `ses:${randomUUID()}`,
      retailer: 'Zara',
      orderRef: null,
      subject: 'Your order',
      fromEmail: 'orders@zara.test',
      items: [
        { ...item('REF 02335709800'), imageUrl: 'https://static.zara.test/1.jpg', size: 'M' },
        { ...item('REF 00613703620'), imageUrl: null },
        { ...item('REF 03067026621'), imageUrl: 'https://static.zara.test/3.jpg' },
      ],
    });
    expect(await inboxIntake.queuePhotoReads(bea, id)).toEqual([]);
    // The hourly task finds it until its photos are asked for.
    const awaiting = async () => (await inboxIntake.awaitingPhotos(500)).map((r) => r.inboxId);
    expect(await awaiting()).toContain(id);
    const queued = await inboxIntake.queuePhotoReads(niall, id);
    expect(await awaiting()).not.toContain(id);
    expect(queued.map((q) => q.url)).toEqual([
      'https://static.zara.test/1.jpg',
      'https://static.zara.test/3.jpg',
    ]);
    expect(await inboxIntake.queuePhotoReads(niall, id)).toEqual([]);

    // The fetcher's reply names the asset the bytes go to; only a queued receipt read takes one.
    const [first, third] = queued;
    const attached = await runner.attachPhoto(first?.jobId ?? '', { stored: true });
    expect(attached?.userId).toBe(niall);
    expect(await runner.attachPhoto(randomUUID(), { stored: true })).toBeUndefined();
    const line = await inboxIntake.line(niall, id, 0);
    expect(line?.item).toMatchObject({ imageAssetId: attached?.assetId, photo: 'reading' });
    expect(await inboxIntake.line(bea, id, 0)).toBeUndefined();

    // The photo decides the name, category and colour; the receipt keeps the price and size.
    await inboxIntake.applyPhotoRead(niall, id, 0, {
      label: 'Black flare leggings',
      categoryL2: 'Trousers',
      categoryL3: 'Leggings',
      color: 'Black',
    });
    // A photo that couldn't be read leaves the line as printed, with no photo.
    await inboxIntake.applyPhotoRead(niall, id, 2, null);
    const [entry] = (await inbox.list(niall, 'inbox')).filter((r) => r.id === id);
    const items = entry?.items as Record<string, unknown>[];
    expect(items[0]).toMatchObject({
      label: 'Black flare leggings',
      size: 'M',
      price: 450,
      photo: 'read',
      imageAssetId: attached?.assetId,
    });
    expect(items[2]).toMatchObject({ label: 'REF 03067026621', imageAssetId: null, photo: 'none' });
    expect(third).toBeDefined();

    // Accepting the line gives the piece its photo.
    const added = await inbox.decide(niall, id, 'wardrobe', [0]);
    const piece = await wardrobe.get(niall, added?.filedIds[0] ?? '');
    expect(piece).toMatchObject({
      label: 'Black flare leggings',
      imageAssetId: attached?.assetId,
      categoryL3: 'Leggings',
    });
  });

  it("reads a line's fields whichever app wrote them", () => {
    // Rows carried over from beta keep its snake_case keys.
    const beta = { label: 'Pink bustier top', size: ' L ', category_l2: 'Tops', color: 'Pink' };
    expect(lineFields(beta)).toEqual({
      size: 'L',
      categoryL2: 'Tops',
      categoryL3: null,
      color: 'Pink',
    });
    expect(lineFields({ label: 'No size' })).toEqual({
      size: null,
      categoryL2: null,
      categoryL3: null,
      color: null,
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
      const after = (second?.items ?? []) as { state?: string }[];
      expect(after.map((i) => i.state ?? 'inbox')).toEqual(['added', 'discarded', 'inbox']);
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

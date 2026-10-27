import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { wishlist, wardrobe } = createRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('wishlist repo', () => {
  it('creates wishes with the taxonomy deciding the category and scopes them per user', async () => {
    const wish = await wishlist.create(ann, {
      label: 'Trench coat',
      categoryL2: 'coats',
      sourceUrl: 'https://shop.test/trench',
    });
    expect(wish).toMatchObject({ category: 'Outerwear', categoryL2: 'Coats', sourceType: 'url' });
    expect(await wishlist.get(bea, wish.id)).toBeUndefined();
    expect(await wishlist.update(bea, wish.id, { label: 'Mine' })).toBeUndefined();
    expect(await wishlist.remove(bea, wish.id)).toBe(false);
    expect(await wishlist.promote(bea, wish.id)).toBeUndefined();
  });

  it('pages newest first, and never skips or repeats rows created in the same instant', async () => {
    const user = await createTestUser(db);
    const labels = ['A', 'B', 'C', 'D', 'E'];
    for (const label of labels) await wishlist.create(user, { label });
    const pageAll = async () => {
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await wishlist.list(user, { limit: 2, cursor });
        seen.push(...page.items.map((w) => w.label));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return seen;
    };
    // Distinct instants: strict newest-first order.
    for (const [i, label] of labels.entries()) {
      await db
        .updateTable('wishlistItems')
        .set({ createdAt: sql`now() - make_interval(secs => ${10 - i})` })
        .where('userId', '=', user)
        .where('label', '=', label)
        .execute();
    }
    expect(await pageAll()).toEqual(['E', 'D', 'C', 'B', 'A']);
    // One instant: the id tiebreak still yields every row exactly once.
    await db
      .updateTable('wishlistItems')
      .set({ createdAt: sql`now()` })
      .where('userId', '=', user)
      .execute();
    const tied = await pageAll();
    expect(tied).toHaveLength(5);
    expect([...tied].sort()).toEqual(labels);
    await deleteTestUsers(db, user);
  });

  it('soft deletes and restores', async () => {
    const wish = await wishlist.create(ann, { label: 'Loafers' });
    expect(await wishlist.remove(ann, wish.id)).toBe(true);
    expect(await wishlist.get(ann, wish.id)).toBeUndefined();
    expect((await wishlist.restore(ann, wish.id))?.id).toBe(wish.id);
  });

  it('promotes a wish into one piece, once, and drops it from the list', async () => {
    const wish = await wishlist.create(ann, {
      label: 'Silk scarf',
      brand: 'Maison',
      note: 'The blue one',
      colourShade: 'powder',
      colourExtra: ['optic'],
      print: 'florals',
      material: 'silk',
      price: 120,
      currency: 'EUR',
    });
    expect(wish).toMatchObject({ color: 'Powder blue', colourShade: 'powder', material: 'silk' });
    const [first, second] = await Promise.all([
      wishlist.promote(ann, wish.id),
      wishlist.promote(ann, wish.id),
    ]);
    const pieces = [first, second].filter(Boolean);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]).toMatchObject({
      label: 'Silk scarf',
      brand: 'Maison',
      notes: 'The blue one',
      colourShade: 'powder',
      colourExtra: ['optic'],
      print: 'florals',
      material: 'silk',
      acquiredVia: 'wishlist',
    });
    expect(await wardrobe.get(ann, pieces[0]?.id ?? '')).toBeDefined();
    expect(await wishlist.get(ann, wish.id)).toBeUndefined();
    const { items } = await wishlist.list(ann, { limit: 50 });
    expect(items.map((w) => w.id)).not.toContain(wish.id);
  });
});

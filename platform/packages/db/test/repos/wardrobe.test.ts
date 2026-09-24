import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { wardrobe } = createRepositories(db);
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

describe('wardrobe repo', () => {
  it('creates pieces with the taxonomy deciding the category', async () => {
    const piece = await wardrobe.create(ann, {
      label: 'Mom jeans',
      categoryL2: 'jeans',
      categoryL3: 'mom jeans',
    });
    expect(piece).toMatchObject({
      category: 'Bottoms',
      categoryL2: 'Jeans',
      categoryL3: 'Mom jeans',
    });
    const unknown = await wardrobe.create(ann, { label: 'Thing', categoryL2: 'Spacesuits' });
    expect(unknown).toMatchObject({ category: 'Other', categoryL2: null });
  });

  it('keeps pieces private to their owner', async () => {
    const piece = await wardrobe.create(ann, { label: 'Silk shirt' });
    expect(await wardrobe.get(bea, piece.id)).toBeUndefined();
    expect(await wardrobe.update(bea, piece.id, { label: 'Stolen' })).toBeUndefined();
    expect(await wardrobe.remove(bea, piece.id)).toBe(false);
    expect((await wardrobe.list(bea, { limit: 50 })).items.map((p) => p.id)).not.toContain(
      piece.id,
    );
    expect((await wardrobe.get(ann, piece.id))?.label).toBe('Silk shirt');
  });

  it('marks a season she sets as hers', async () => {
    const piece = await wardrobe.create(ann, { label: 'Linen dress' });
    const updated = await wardrobe.update(ann, piece.id, { seasonBand: 'spring_summer' });
    expect(updated).toMatchObject({ seasonBand: 'spring_summer', seasonSource: 'user' });
  });

  it('soft deletes and restores (undo)', async () => {
    const piece = await wardrobe.create(ann, { label: 'Scarf' });
    expect(await wardrobe.remove(ann, piece.id)).toBe(true);
    expect(await wardrobe.get(ann, piece.id)).toBeUndefined();
    expect((await wardrobe.restore(ann, piece.id))?.id).toBe(piece.id);
    expect(await wardrobe.restore(bea, piece.id)).toBeUndefined();
  });

  it('pages with a stable cursor', async () => {
    const user = await createTestUser(db);
    // Same-millisecond rows are the case that broke microsecond vs millisecond comparison.
    await db
      .insertInto('wardrobeItems')
      .values(Array.from({ length: 5 }, (_, i) => ({ userId: user, label: `Piece ${i}` })))
      .execute();
    const first = await wardrobe.list(user, { limit: 2 });
    const second = await wardrobe.list(user, { limit: 2, cursor: first.nextCursor ?? undefined });
    const third = await wardrobe.list(user, { limit: 2, cursor: second.nextCursor ?? undefined });
    const ids = [...first.items, ...second.items, ...third.items].map((p) => p.id);
    expect(new Set(ids).size).toBe(5);
    expect(third.nextCursor).toBeNull();
    await deleteTestUsers(db, user);
  });

  it('moves a hero position rather than colliding', async () => {
    const a = await wardrobe.create(ann, { label: 'Hero A' });
    const b = await wardrobe.create(ann, { label: 'Hero B' });
    await wardrobe.setHero(ann, a.id, 1);
    await wardrobe.setHero(ann, b.id, 1);
    expect((await wardrobe.get(ann, a.id))?.heroPosition).toBeNull();
    expect((await wardrobe.get(ann, b.id))?.heroPosition).toBe(1);
  });

  it('counts only pieces Robes has finished reading', async () => {
    const user = await createTestUser(db);
    await wardrobe.create(user, { label: 'Ready' });
    await wardrobe.create(user, { label: 'Reading', status: 'reading' });
    expect(await wardrobe.countReady(user)).toBe(1);
    expect(await wardrobe.count(user)).toBe(2);
    await deleteTestUsers(db, user);
  });
});

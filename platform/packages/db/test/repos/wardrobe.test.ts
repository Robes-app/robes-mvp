import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HeroRackFull } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { wardrobe, looks } = createRepositories(db);
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
  it('files what a piece is worn for, replacing what was inferred, and keeps it to its owner', async () => {
    const coat = await wardrobe.create(ann, { label: 'Camel coat', categoryL2: 'Coats' });
    // The trigger seeds a default from the category when the piece is filed.
    expect((await wardrobe.wearTags(ann, [coat.id])).get(coat.id)).toEqual(['Everyday']);

    expect(await wardrobe.setWearTags(ann, coat.id, ['Work', 'School run'])).toBe(true);
    expect((await wardrobe.wearTags(ann, [coat.id])).get(coat.id)).toEqual(['School run', 'Work']);

    // Her own answer replaces what was inferred; nothing she did not pick survives.
    expect(await wardrobe.setWearTags(ann, coat.id, ['Work'])).toBe(true);
    expect((await wardrobe.wearTags(ann, [coat.id])).get(coat.id)).toEqual(['Work']);

    // Another woman's piece is not hers to tag, and nothing is written.
    expect(await wardrobe.setWearTags(bea, coat.id, ['Evening'])).toBe(false);
    expect((await wardrobe.wearTags(ann, [coat.id])).get(coat.id)).toEqual(['Work']);
    expect(await wardrobe.wearTags(bea, [coat.id])).toEqual(new Map());
  });

  it("reads a piece's own record, and keeps it to its owner", async () => {
    const coat = await wardrobe.create(ann, { label: 'Camel coat' });
    const look = await looks.create(ann, {
      name: 'Gallery opening',
      nameProvisional: false,
      pieces: [{ pieceId: coat.id }],
    });
    await looks.wear(ann, look.id, '2026-09-24');
    await looks.wear(ann, look.id, '2026-09-20');
    const record = await wardrobe.wears(ann, coat.id);
    expect(record.map((w) => [w.wornOn, w.lookName])).toEqual([
      ['2026-09-24', 'Gallery opening'],
      ['2026-09-20', 'Gallery opening'],
    ]);
    // A piece that is not hers has no record to read.
    expect(await wardrobe.wears(bea, coat.id)).toEqual([]);
  });

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

  it('files a shade, writing its name as the colour word, and refines by family', async () => {
    const user = await createTestUser(db);
    const navy = await wardrobe.create(user, {
      label: 'Breton top',
      colourShade: 'navy',
      colourExtra: ['optic'],
      print: 'stripes',
    });
    expect(navy).toMatchObject({ color: 'Navy', colourExtra: ['optic'], print: 'stripes' });
    const red = await wardrobe.create(user, { label: 'Red bag', color: 'Red' });
    await db
      .updateTable('wardrobeItems')
      .set({ itemDna: JSON.stringify({ colour_check: true, formality: 'smart' }) })
      .where('id', '=', red.id)
      .execute();
    const edited = await wardrobe.update(user, red.id, { colourShade: 'cherry' });
    expect(edited).toMatchObject({ color: 'Cherry', colourShade: 'cherry' });
    // Her answer clears Robes' check flag and nothing else.
    expect(edited?.itemDna).toEqual({ formality: 'smart' });
    const blues = await wardrobe.list(user, { limit: 10, colourFamily: 'blues' });
    expect(blues.items.map((p) => p.id)).toEqual([navy.id]);
    expect(await wardrobe.countMatching(user, { colourFamily: 'reds' })).toBe(1);
    expect(await wardrobe.countMatching(user, { colourFamily: 'nope' })).toBe(0);
    expect((await wardrobe.list(ann, { limit: 50, colourFamily: 'blues' })).items).toEqual([]);
    await deleteTestUsers(db, user);
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

  it('counts the pieces a filter matches and the pieces in each category', async () => {
    const user = await createTestUser(db);
    await wardrobe.create(user, { label: 'Jeans', categoryL2: 'jeans' });
    await wardrobe.create(user, {
      label: 'Skirt',
      categoryL2: 'skirts',
      seasonBand: 'spring_summer',
    });
    await wardrobe.create(user, { label: 'Coat', categoryL2: 'coats' });
    expect(await wardrobe.countMatching(user, {})).toBe(3);
    expect(await wardrobe.countMatching(user, { category: 'Bottoms' })).toBe(2);
    expect(await wardrobe.countMatching(user, { seasonBand: 'spring_summer' })).toBe(1);
    expect(await wardrobe.countMatching(bea, { category: 'Bottoms' })).toBe(0);
    const counts = await wardrobe.categoryCounts(user);
    expect(counts).toEqual(
      expect.arrayContaining([
        { category: 'Bottoms', count: 2 },
        { category: 'Outerwear', count: 1 },
      ]),
    );
    expect(await wardrobe.categoryCounts(bea)).not.toContainEqual({
      category: 'Outerwear',
      count: 1,
    });
    await deleteTestUsers(db, user);
  });

  it('counts the times each of her pieces was worn, never another person’s wears', async () => {
    const user = await createTestUser(db);
    const shirt = await wardrobe.create(user, { label: 'Shirt' });
    const jeans = await wardrobe.create(user, { label: 'Jeans' });
    const look = await looks.create(user, {
      name: 'Errands',
      nameProvisional: false,
      pieces: [{ pieceId: shirt.id }, { pieceId: jeans.id }],
    });
    const other = await looks.create(user, {
      name: 'Office',
      nameProvisional: false,
      pieces: [{ pieceId: shirt.id }],
    });
    await looks.wear(user, look.id, '2026-10-01');
    await looks.wear(user, look.id, '2026-10-02');
    await looks.wear(user, other.id, '2026-10-03');
    const counts = await wardrobe.wearCounts(user, [shirt.id, jeans.id]);
    expect(counts.get(shirt.id)).toBe(3);
    expect(counts.get(jeans.id)).toBe(2);
    expect((await wardrobe.wearCounts(bea, [shirt.id])).size).toBe(0);
    expect((await wardrobe.wearCounts(user, [])).size).toBe(0);
    await deleteTestUsers(db, user);
  });

  it('finds the first free Hero Rack position', async () => {
    const user = await createTestUser(db);
    expect(await wardrobe.nextHeroPosition(user)).toBe(1);
    const a = await wardrobe.create(user, { label: 'A' });
    await wardrobe.setHero(user, a.id, 1);
    expect(await wardrobe.nextHeroPosition(user)).toBe(2);
    for (let p = 2; p <= 10; p++) {
      const piece = await wardrobe.create(user, { label: `P${p}` });
      await wardrobe.setHero(user, piece.id, p);
    }
    expect(await wardrobe.nextHeroPosition(user)).toBeNull();
    expect(await wardrobe.nextHeroPosition(bea)).not.toBeNull();

    // A star with the rack full writes nothing, not even the other fields of the edit.
    const late = await wardrobe.create(user, { label: 'Late' });
    await expect(
      wardrobe.edit(user, late.id, { label: 'Renamed', brand: 'COS' }, { star: true }),
    ).rejects.toBeInstanceOf(HeroRackFull);
    expect(await wardrobe.get(user, late.id)).toMatchObject({
      label: 'Late',
      brand: null,
      heroPosition: null,
    });
    // Off the rack and a field together, then the free place goes to the next star.
    expect(await wardrobe.edit(user, a.id, { label: 'A2' }, { star: false })).toMatchObject({
      label: 'A2',
      heroPosition: null,
    });
    expect(await wardrobe.edit(user, late.id, { label: 'Renamed' }, { star: true })).toMatchObject({
      label: 'Renamed',
      heroPosition: 1,
    });
    expect(await wardrobe.edit(bea, late.id, { label: 'Stolen' }, { star: false })).toBeUndefined();
    expect((await wardrobe.get(user, late.id))?.label).toBe('Renamed');
    await deleteTestUsers(db, user);
  });
});

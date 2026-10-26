import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HeroRackFull } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { wardrobe, looks } = createRepositories(db);
const { pieces } = createSystemRepositories(db);
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

  it("files a material; her answer clears Robes' check on it alone, and stays hers", async () => {
    const piece = await wardrobe.create(ann, { label: 'Wool blazer', material: 'wool' });
    expect(piece.material).toBe('wool');
    await db
      .updateTable('wardrobeItems')
      .set({
        itemDna: JSON.stringify({ colour_check: true, material_check: true, formality: 'smart' }),
      })
      .where('id', '=', piece.id)
      .execute();

    const picked = await wardrobe.update(ann, piece.id, { material: 'polyester' });
    expect(picked?.material).toBe('polyester');
    expect(picked?.itemDna).toEqual({ colour_check: true, formality: 'smart' });

    // "Not sure" is an answer too: nothing filed, and no doubt left on the row.
    await db
      .updateTable('wardrobeItems')
      .set({ itemDna: JSON.stringify({ material_check: true }) })
      .where('id', '=', piece.id)
      .execute();
    const unsure = await wardrobe.edit(ann, piece.id, { material: null, colourShade: 'navy' });
    expect(unsure).toMatchObject({ material: null, colourShade: 'navy', itemDna: {} });

    // Another woman cannot file a material on it, and nothing is written.
    expect(await wardrobe.update(bea, piece.id, { material: 'silk' })).toBeUndefined();
    expect((await wardrobe.get(ann, piece.id))?.material).toBeNull();
  });

  it('the read fills a material, but never over one she already picked', async () => {
    const read = {
      label: 'Denim jacket',
      categoryL2: null,
      categoryL3: null,
      category: 'Outerwear',
      color: 'Denim',
      colourShade: 'denim',
      colourExtra: [],
      print: null,
      brand: null,
      price: null,
      currency: null,
      size: null,
      notes: null,
    };
    const fresh = await wardrobe.create(ann, { label: 'New piece', status: 'reading' });
    await pieces.apply(ann, fresh.id, {
      ...read,
      material: 'denim',
      itemDna: { material_check: true, prompt_version: 4 },
    });
    expect(await wardrobe.get(ann, fresh.id)).toMatchObject({
      material: 'denim',
      itemDna: { material_check: true, prompt_version: 4 },
    });

    const answered = await wardrobe.create(ann, {
      label: 'New piece',
      status: 'reading',
      material: 'cotton',
    });
    await pieces.apply(ann, answered.id, {
      ...read,
      material: 'denim',
      itemDna: { material_check: true, prompt_version: 4 },
    });
    expect(await wardrobe.get(ann, answered.id)).toMatchObject({
      material: 'cotton',
      itemDna: { prompt_version: 4 },
    });
    // The read is scoped to the job owner: another user's id fills nothing.
    const other = await wardrobe.create(ann, { label: 'New piece', status: 'reading' });
    await pieces.apply(bea, other.id, { ...read, material: 'silk', itemDna: {} });
    expect((await wardrobe.get(ann, other.id))?.material).toBeNull();
  });

  it('a read that finds nothing leaves no piece, and only for the job owner', async () => {
    const reading = await wardrobe.create(ann, { label: 'New piece', status: 'reading' });
    // Another user's id discards nothing.
    expect(await pieces.discard(bea, reading.id)).toBe(false);
    expect(await wardrobe.get(ann, reading.id)).toBeDefined();
    expect(await pieces.discard(ann, reading.id)).toBe(true);
    expect(await wardrobe.get(ann, reading.id)).toBeUndefined();
    const row = await db
      .selectFrom('wardrobeItems')
      .select('id')
      .where('id', '=', reading.id)
      .executeTakeFirst();
    expect(row).toBeUndefined();
    // A piece the read already filled is never discarded.
    const filed = await wardrobe.create(ann, { label: 'Camel coat' });
    expect(await pieces.discard(ann, filed.id)).toBe(false);
    expect(await wardrobe.get(ann, filed.id)).toBeDefined();
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

import { WEAR_FOR_ALL } from '@robes/core/filters';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { tags, looks, wardrobe } = createRepositories(db);
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

const labels = async (user: UserId) => (await tags.list(user)).map((t) => t.label).sort();
const find = async (user: UserId, label: string) =>
  (await tags.list(user)).find((t) => t.label === label);
const newLook = (user: UserId) =>
  looks.create(user, { name: 'Gallery night', nameProvisional: true, pieces: [] });

describe('tags repo', () => {
  it('starts every account with the eight defaults, as her own tags', async () => {
    const list = await tags.list(ann);
    expect(list.map((t) => t.label).sort()).toEqual([...WEAR_FOR_ALL].sort());
    expect(list.every((t) => t.isSeed && t.looks === 0 && t.pieces === 0)).toBe(true);
  });

  it('adds a tag she types to her list, shared by her looks and pieces, and counts both', async () => {
    const look = await newLook(ann);
    const coat = await wardrobe.create(ann, { label: 'Camel coat' });
    expect(await looks.setTags(ann, look.id, ['City', 'Work'])).toBe(true);
    expect(await wardrobe.setWearTags(ann, coat.id, ['city'])).toBe(true);
    const city = await find(ann, 'City');
    expect(city).toMatchObject({ isSeed: false, looks: 1, pieces: 1 });
    expect(await labels(bea)).not.toContain('City');
  });

  it('deletes a tag from her list and from every look and piece that carried it', async () => {
    const look = await newLook(ann);
    const coat = await wardrobe.create(ann, { label: 'Wool coat' });
    await looks.setTags(ann, look.id, ['Beach', 'Work']);
    await wardrobe.setWearTags(ann, coat.id, ['Beach']);
    const beach = await find(ann, 'Beach');
    if (!beach) throw new Error('no Beach');

    // Another woman cannot delete it, and nothing is written.
    expect(await tags.remove(bea, beach.id)).toBe(false);
    expect(await find(ann, 'Beach')).toBeDefined();

    expect(await tags.remove(ann, beach.id)).toBe(true);
    expect(await find(ann, 'Beach')).toBeUndefined();
    expect((await looks.tagsFor(ann, [look.id])).get(look.id)).toEqual(['Work']);
    expect((await wardrobe.wearTags(ann, [coat.id])).get(coat.id)).toBeUndefined();
    // Gone already: a second delete finds nothing.
    expect(await tags.remove(ann, beach.id)).toBe(false);

    // Typed again, it is a fresh tag of her own, on nothing it was on before.
    const other = await newLook(ann);
    await looks.setTags(ann, other.id, ['beach']);
    expect(await find(ann, 'beach')).toMatchObject({ isSeed: false, looks: 1, pieces: 0 });
    expect((await looks.tagsFor(ann, [look.id])).get(look.id)).toEqual(['Work']);
  });

  it('never brings back a default she deleted when a piece is filed from its category', async () => {
    const everyday = await find(bea, 'Everyday');
    if (!everyday) throw new Error('no Everyday');
    expect(await tags.remove(bea, everyday.id)).toBe(true);
    // A coat is filed with Everyday from its category: not once she has deleted it.
    const coat = await wardrobe.create(bea, { label: 'Camel coat', categoryL2: 'Coats' });
    expect((await wardrobe.wearTags(bea, [coat.id])).get(coat.id)).toBeUndefined();
    expect(await labels(bea)).not.toContain('Everyday');
    expect(await wardrobe.wearLabels(bea)).not.toContain('Everyday');
  });
});

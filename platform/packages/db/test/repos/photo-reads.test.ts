import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories, type ReadPieceRow } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { photoReads, assets: processing } = createSystemRepositories(db);
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

const photo = (userId: UserId, kind: 'wardrobe' | 'look_photo' = 'wardrobe') =>
  repos.assets.createPending(userId, { kind, contentType: 'image/jpeg', bytes: 1000 });

function read(sourceIndex: number, imageAssetId: string | null, over: Partial<ReadPieceRow> = {}) {
  return {
    sourceIndex,
    label: 'Black leggings',
    category: 'Bottoms',
    categoryL2: null,
    categoryL3: null,
    color: 'Black',
    brand: null,
    notes: null,
    price: null,
    currency: null,
    size: null,
    itemDna: { source: { kind: 'photo_multi' } },
    imageAssetId,
    ...over,
  };
}

describe('photo reads', () => {
  it('reads only her photo and her ready pieces', async () => {
    const src = await photo(ann);
    expect(await photoReads.source(bea, src.id)).toBeUndefined();
    expect((await photoReads.source(ann, src.id))?.kind).toBe('wardrobe');

    const mine = await repos.wardrobe.create(ann, { label: 'White running shoes' });
    await repos.wardrobe.create(ann, { label: 'Reading', status: 'reading' });
    const theirs = await repos.wardrobe.create(bea, { label: 'Their coat' });
    const closet = (await photoReads.closet(ann)).map((p) => p.id);
    expect(closet).toContain(mine.id);
    expect(closet).not.toContain(theirs.id);
    expect((await photoReads.closet(ann)).map((p) => p.label)).not.toContain('Reading');
  });

  it('creates crop assets the rendition pipeline cuts from the source', async () => {
    const src = await photo(ann);
    const crop = await photoReads.createCrop(ann, src.id, { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(await processing.get(crop)).toMatchObject({
      userId: ann,
      status: 'pending',
      crop: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    });
    // The composite FK keeps a crop on its owner's photo.
    await expect(photoReads.createCrop(bea, src.id, { x: 0, y: 0, w: 1, h: 1 })).rejects.toThrow();
  });

  it('files each piece of a read once, however often the filing is retried', async () => {
    const src = await photo(ann);
    const crop0 = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 0.5, h: 0.5 });
    const crop1 = await photoReads.createCrop(ann, src.id, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    const rows = [
      read(0, crop0, {
        label: 'Cream long-sleeve t-shirt',
        category: 'Tops',
        categoryL2: 'T-shirts & tees',
      }),
      read(1, crop1),
    ];
    const first = await repos.wardrobe.createFromRead(ann, src.id, rows);
    const again = await repos.wardrobe.createFromRead(ann, src.id, rows);
    expect(first.map((p) => p.id).sort()).toEqual(again.map((p) => p.id).sort());
    expect(first.find((p) => p.sourceIndex === 0)).toMatchObject({
      label: 'Cream long-sleeve t-shirt',
      category: 'Tops',
      categoryL2: 'T-shirts & tees',
      imageAssetId: crop0,
      status: 'ready',
    });
    expect(first.find((p) => p.sourceIndex === 1)?.category).toBe('Bottoms');
    // Her photo can't be filed into someone else's wardrobe.
    await expect(repos.wardrobe.createFromRead(bea, src.id, [read(2, null)])).rejects.toThrow();
  });

  it('gives a photo-less piece the crop and leaves one with a photo alone', async () => {
    const src = await photo(ann);
    const crop = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 });
    const bare = await repos.wardrobe.create(ann, { label: 'White running shoes' });
    expect(await repos.wardrobe.adoptPhoto(bea, bare.id, crop)).toBe(false);
    expect(await repos.wardrobe.adoptPhoto(ann, bare.id, crop)).toBe(true);
    expect((await repos.wardrobe.get(ann, bare.id))?.imageAssetId).toBe(crop);
    const other = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 });
    expect(await repos.wardrobe.adoptPhoto(ann, bare.id, other)).toBe(false);
  });

  it('discards only her unused crops', async () => {
    const src = await photo(ann);
    const used = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 });
    const spare = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 });
    await repos.wardrobe.createFromRead(ann, src.id, [read(0, used)]);
    expect(await repos.assets.discardCrops(bea, src.id, [spare])).toBe(0);
    expect(await repos.assets.discardCrops(ann, src.id, [used, spare])).toBe(1);
    expect(await repos.assets.getForUser(ann, spare)).toBeUndefined();
    expect(await repos.assets.getForUser(ann, used)).toBeDefined();
  });

  it("carries her colour and material answers, else Robes' colour word decides the shade", async () => {
    const src = await photo(ann);
    const [answered, read0] = [
      await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 }),
      await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 }),
    ];
    const filed = await repos.wardrobe.createFromRead(ann, src.id, [
      read(0, answered, {
        colourShade: 'navy',
        colourExtra: ['ivory'],
        print: 'stripes',
        material: 'cotton',
      }),
      read(1, read0),
    ]);
    expect(filed.find((p) => p.sourceIndex === 0)).toMatchObject({
      colourShade: 'navy',
      color: 'Navy',
      colourExtra: ['ivory'],
      print: 'stripes',
      material: 'cotton',
    });
    expect(filed.find((p) => p.sourceIndex === 1)?.colourShade).not.toBeNull();
  });

  it('keeps a piece to the wish list once, with its crop, and never discards that crop', async () => {
    const src = await photo(ann);
    const crop = await photoReads.createCrop(ann, src.id, { x: 0, y: 0, w: 1, h: 1 });
    const wish = { label: 'Black leggings', category: 'Bottoms', imageAssetId: crop, note: 'Soft' };
    const first = await repos.wishlist.createFromRead(ann, [wish]);
    const again = await repos.wishlist.createFromRead(ann, [wish]);
    expect(again.map((w) => w.id)).toEqual(first.map((w) => w.id));
    expect(first[0]).toMatchObject({ category: 'Bottoms', note: 'Soft', sourceType: 'photo' });
    expect(await repos.assets.discardCrops(ann, src.id, [crop])).toBe(0);
    // Her crop never makes someone else's wish (the composite FK keeps it on its owner).
    await expect(repos.wishlist.createFromRead(bea, [wish])).rejects.toThrow();
  });
});

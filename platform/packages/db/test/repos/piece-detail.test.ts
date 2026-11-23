import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { wardrobe, assets } = createRepositories(db);
const { pieces, detailReread, assets: processing } = createSystemRepositories(db);
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

const dna = async (userId: UserId, id: string) =>
  (await wardrobe.get(userId, id))?.itemDna as Record<string, unknown>;

// A filed piece with a rendered photograph of hers in the bucket.
async function filed(userId: UserId, itemDna: Record<string, unknown> = {}) {
  const asset = await assets.createPending(userId, {
    kind: 'wardrobe',
    contentType: 'image/jpeg',
    bytes: 1000,
  });
  await processing.markReady(asset.id, {
    bucketKey: `media/${userId}/${asset.id}/master.jpg`,
    width: 800,
    height: 1000,
    blurhash: 'L',
    renditions: { v: 1, master: { width: 800, height: 1000 }, widths: [320] },
  });
  const piece = await wardrobe.create(userId, { label: 'Taupe coat', imageAssetId: asset.id });
  await db
    .updateTable('wardrobeItems')
    .set({ itemDna: JSON.stringify(itemDna) })
    .where('id', '=', piece.id)
    .execute();
  return piece;
}

const read = {
  label: 'Taupe coat',
  categoryL2: null,
  categoryL3: null,
  category: 'Outerwear',
  color: null,
  colourShade: null,
  colourExtra: [],
  print: null,
  material: null,
  brand: null,
  price: null,
  currency: null,
  size: null,
  notes: null,
};

describe("a piece's defining detail", () => {
  it('her words sit beside the read, marked hers, and leave the rest of it alone', async () => {
    const piece = await filed(ann, {
      structural_dna: { silhouette_fit: ['Longline'], defining_detail: 'Padded shoulder' },
      colour_check: true,
    });
    expect(await wardrobe.setDetail(ann, piece.id, 'Strong extended shoulder')).toBe(true);
    expect(await dna(ann, piece.id)).toEqual({
      structural_dna: { silhouette_fit: ['Longline'], defining_detail: 'Strong extended shoulder' },
      colour_check: true,
      detail_hers: true,
    });
    // Cleared is an answer too: gone, and still hers.
    await wardrobe.setDetail(ann, piece.id, null);
    expect(await dna(ann, piece.id)).toEqual({
      structural_dna: { silhouette_fit: ['Longline'] },
      colour_check: true,
      detail_hers: true,
    });
  });

  it('is hers alone to change', async () => {
    const piece = await filed(ann, { structural_dna: { defining_detail: 'Padded shoulder' } });
    expect(await wardrobe.setDetail(bea, piece.id, 'Not yours')).toBe(false);
    expect(await dna(ann, piece.id)).toEqual({
      structural_dna: { defining_detail: 'Padded shoulder' },
    });
  });

  it('a later read of the photo never writes over her answer', async () => {
    const piece = await filed(ann, {});
    await wardrobe.setDetail(ann, piece.id, 'Strong extended shoulder');
    await pieces.apply(ann, piece.id, {
      ...read,
      itemDna: {
        structural_dna: { silhouette_fit: ['Longline'], defining_detail: 'Notch lapel' },
        detail_read: true,
        prompt_version: 6,
      },
    });
    expect(await dna(ann, piece.id)).toMatchObject({
      structural_dna: { silhouette_fit: ['Longline'], defining_detail: 'Strong extended shoulder' },
      detail_hers: true,
      prompt_version: 6,
    });
    // One she cleared stays cleared.
    const cleared = await filed(ann, {});
    await wardrobe.setDetail(ann, cleared.id, null);
    await pieces.apply(ann, cleared.id, {
      ...read,
      itemDna: { structural_dna: { defining_detail: 'Notch lapel' }, detail_read: true },
    });
    expect((await dna(ann, cleared.id)).structural_dna).toEqual({});
  });
});

describe('the one-off re-read for a defining detail', () => {
  it('is due for a piece read before the read asked, with her photograph in the bucket', async () => {
    const old = await filed(ann, { structural_dna: { silhouette_fit: ['Longline'] } });
    const asked = await filed(ann, { detail_read: true });
    const hers = await filed(ann, {});
    await wardrobe.setDetail(ann, hers.id, 'Bold lapel');
    const noPhoto = await wardrobe.create(ann, { label: 'No photo' });
    const reading = await wardrobe.create(ann, { label: 'Reading', status: 'reading' });
    const gone = await filed(ann, {});
    await wardrobe.remove(ann, gone.id);
    const theirs = await filed(bea, {});

    const due = [];
    for (let afterId: string | undefined; ; ) {
      const page = await detailReread.due({ limit: 2, afterId });
      if (page.length === 0) break;
      due.push(...page);
      afterId = page.at(-1)?.id;
    }
    const ids = due.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([old.id, theirs.id]));
    for (const not of [asked, hers, noPhoto, reading, gone]) expect(ids).not.toContain(not.id);
    expect(due.find((p) => p.id === old.id)).toMatchObject({
      userId: ann,
      label: 'Taupe coat',
      imageAssetId: expect.any(String),
    });
    const count = await detailReread.count();
    expect(count.pieces).toBeGreaterThanOrEqual(2);
    expect(count.users).toBeGreaterThanOrEqual(2);
  });

  it('adds the detail and nothing else, once', async () => {
    const piece = await filed(ann, {
      structural_dna: { silhouette_fit: ['Longline'] },
      formality: 'smart',
      material_check: true,
    });
    const before = await wardrobe.get(ann, piece.id);
    expect(await detailReread.addDetail(ann, piece.id, 'Strong padded shoulder')).toBe(true);
    const after = await wardrobe.get(ann, piece.id);
    expect(after?.itemDna).toEqual({
      structural_dna: { silhouette_fit: ['Longline'], defining_detail: 'Strong padded shoulder' },
      formality: 'smart',
      material_check: true,
      detail_read: true,
    });
    // Every column of hers is as it was.
    const { itemDna: _a, updatedAt: _b, ...was } = before ?? {};
    const { itemDna: _c, updatedAt: _d, ...is } = after ?? {};
    expect(is).toEqual(was);
    // No longer due.
    const due = await detailReread.due({ limit: 100 });
    expect(due.map((p) => p.id)).not.toContain(piece.id);
  });

  it('marks a plain piece as read and files nothing', async () => {
    const piece = await filed(ann, { structural_dna: { silhouette_fit: ['Slim'] } });
    expect(await detailReread.addDetail(ann, piece.id, null)).toBe(true);
    expect(await dna(ann, piece.id)).toEqual({
      structural_dna: { silhouette_fit: ['Slim'] },
      detail_read: true,
    });
  });

  it('never writes over a detail that is already there, or one she answered', async () => {
    const has = await filed(ann, { structural_dna: { defining_detail: 'Bold lapel' } });
    await detailReread.addDetail(ann, has.id, 'Strong padded shoulder');
    expect((await dna(ann, has.id)).structural_dna).toEqual({ defining_detail: 'Bold lapel' });

    const hers = await filed(ann, {});
    await wardrobe.setDetail(ann, hers.id, null);
    expect(await detailReread.addDetail(ann, hers.id, 'Strong padded shoulder')).toBe(false);
    expect(await dna(ann, hers.id)).toEqual({ structural_dna: {}, detail_hers: true });
  });

  it("never writes to another user's piece", async () => {
    const piece = await filed(ann, {});
    expect(await detailReread.addDetail(bea, piece.id, 'Strong padded shoulder')).toBe(false);
    expect(await dna(ann, piece.id)).toEqual({});
  });
});

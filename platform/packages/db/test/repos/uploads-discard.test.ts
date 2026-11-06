import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { ASSET_ID_COLUMNS } from '../../src/repos/assets';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

// D20: a look photo uploaded in image mode and never accepted is deleted. Her Discard marks it
// deleted (assets.discardUpload); the maintenance sweep (staleUploads) deletes its files and row,
// and catches the ones never discarded once a day old. Nothing anything holds is ever deleted.
const db = createTestDb();
const repos = createRepositories(db);
const { staleUploads, photoReads, assets: processing } = createSystemRepositories(db);
const SWEEP = { olderThanHours: 24, withinDays: 7 };
let ann: UserId;
let bea: UserId;
let coat: string;

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann Discard');
  bea = await createTestUser(db, 'Bea Discard');
  coat = (await repos.wardrobe.create(ann, { label: 'Camel coat' })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

const upload = (userId: UserId, kind: 'look_photo' | 'wardrobe' = 'look_photo') =>
  repos.assets.createPending(userId, { kind, contentType: 'image/jpeg', bytes: 1000 });

const row = (id: string) =>
  db
    .selectFrom('assets')
    .select(['id', 'status', 'deletedAt'])
    .where('id', '=', id)
    .executeTakeFirst();

async function age(id: string, hours: number) {
  await db
    .updateTable('assets')
    .set({ createdAt: sql<Date>`now() - make_interval(hours => ${hours})` })
    .where('id', '=', id)
    .execute();
}

const files = () => vi.fn(async (_userId: UserId, _assetId: string) => {});
const due = async () => (await staleUploads.due({ ...SWEEP, limit: 1000 })).map((a) => a.id);

const look = (name: string) =>
  repos.looks.create(ann, { name, nameProvisional: false, pieces: [{ pieceId: coat }] });

describe('assets.discardUpload (her Discard)', () => {
  it('marks her unheld look photo deleted at once, gone from every read', async () => {
    const photo = await upload(ann);
    expect(await repos.assets.discardUpload(ann, photo.id)).toBe('discarded');
    expect(await row(photo.id)).toMatchObject({ status: 'deleted' });
    expect((await row(photo.id))?.deletedAt).not.toBeNull();
    expect(await repos.assets.getForUser(ann, photo.id)).toBeUndefined();
    // Gone is gone: a second Discard finds nothing.
    expect(await repos.assets.discardUpload(ann, photo.id)).toBe('not_found');
    // The sweep takes it on its next run, however young it is.
    expect(await due()).toContain(photo.id);
  });

  it('is not_found for another woman’s photo, which stays as it was', async () => {
    const photo = await upload(ann);
    expect(await repos.assets.discardUpload(bea, photo.id)).toBe('not_found');
    expect(await row(photo.id)).toMatchObject({ status: 'pending', deletedAt: null });
  });

  it('never touches another kind of asset', async () => {
    const piecePhoto = await upload(ann, 'wardrobe');
    expect(await repos.assets.discardUpload(ann, piecePhoto.id)).toBe('not_found');
    await age(piecePhoto.id, 48);
    expect(await due()).not.toContain(piecePhoto.id);
    expect(await row(piecePhoto.id)).toMatchObject({ deletedAt: null });
  });

  it('keeps a discarded photo deleted when its rendition lands afterwards', async () => {
    const photo = await upload(ann);
    await repos.assets.discardUpload(ann, photo.id);
    const meta = { bucketKey: 'k', width: 10, height: 10, blurhash: 'x', renditions: {} };
    expect(await processing.markReady(photo.id, meta)).toBe(false);
    expect(await row(photo.id)).toMatchObject({ status: 'deleted' });
  });
});

describe('staleUploads (the sweep)', () => {
  it('deletes an old unattached photo of every user, as its owner, files first', async () => {
    const [old, fresh, theirs] = [await upload(ann), await upload(ann), await upload(bea)];
    await age(old.id, 25);
    await age(theirs.id, 25);
    expect(await due()).toEqual(expect.arrayContaining([old.id, theirs.id]));
    expect(await due()).not.toContain(fresh.id);

    expect(await staleUploads.discard(bea, old.id, SWEEP, files())).toBe('not_found');
    const remove = files();
    expect(await staleUploads.discard(ann, old.id, SWEEP, remove)).toBe('discarded');
    expect(remove).toHaveBeenCalledWith(ann, old.id);
    expect(await row(old.id)).toBeUndefined();
    // Too young to sweep, even when asked for directly.
    expect(await staleUploads.discard(ann, fresh.id, SWEEP, files())).toBe('not_found');
    expect(await row(fresh.id)).toBeDefined();
  });

  it('keeps the row when removing its files fails, so the next run tries again', async () => {
    const photo = await upload(ann);
    await repos.assets.discardUpload(ann, photo.id);
    const failing = vi.fn(async () => {
      throw new Error('SlowDown');
    });
    await expect(staleUploads.discard(ann, photo.id, SWEEP, failing)).rejects.toThrow('SlowDown');
    expect(await row(photo.id)).toBeDefined();
    expect(await due()).toContain(photo.id);
  });

  it('looks back only withinDays for photos never discarded', async () => {
    const ancient = await upload(ann);
    await age(ancient.id, 24 * 8);
    expect(await due()).not.toContain(ancient.id);
  });

  it('pages by id', async () => {
    const [a, b] = [await upload(ann), await upload(ann)];
    await age(a.id, 30);
    await age(b.id, 30);
    const first = [a.id, b.id].sort()[0] as string;
    const after = (await staleUploads.due({ ...SWEEP, limit: 1000, afterId: first })).map(
      (r) => r.id,
    );
    expect(after).not.toContain(first);
    expect(after.every((id) => id > first)).toBe(true);
  });
});

describe('referenced assets are never deleted', () => {
  async function held(assetId: string) {
    expect(await repos.assets.discardUpload(ann, assetId)).toBe('held');
    expect(await row(assetId)).toMatchObject({ deletedAt: null });
    await age(assetId, 48);
    expect(await due()).not.toContain(assetId);
    const remove = files();
    expect(await staleUploads.discard(ann, assetId, SWEEP, remove)).toBe('held');
    expect(remove).not.toHaveBeenCalled();
    expect(await row(assetId)).toBeDefined();
  }

  it('a photo in a look’s stack (look_images)', async () => {
    const photo = await upload(ann);
    const l = await look('Stacked');
    await repos.looks.addImage(ann, l.id, photo.id);
    await held(photo.id);
  });

  it('a look’s photograph (photo_asset_id)', async () => {
    const photo = await upload(ann);
    await repos.looks.create(ann, {
      name: 'From a photo',
      nameProvisional: false,
      pieces: [{ pieceId: coat }],
      photoAssetId: photo.id,
    });
    await held(photo.id);
  });

  it('a photo on a soft-deleted look, which a restore brings back', async () => {
    const photo = await upload(ann);
    const l = await look('Let go');
    await repos.looks.addImage(ann, l.id, photo.id);
    await db.updateTable('looks').set({ deletedAt: sql`now()` }).where('id', '=', l.id).execute();
    await held(photo.id);
  });

  it('a photo a read was cut from (crops), and one a read job was handed', async () => {
    const photo = await upload(ann);
    await photoReads.createCrop(ann, photo.id, { x: 0, y: 0, w: 0.5, h: 0.5 });
    await held(photo.id);

    const read = await upload(ann);
    await db
      .insertInto('generationJobs')
      .values({ userId: ann, kind: 'wardrobe_pieces', input: JSON.stringify({ assetId: read.id }) })
      .execute();
    await held(read.id);
  });

  it('a photo any other column holds (a piece’s image)', async () => {
    const photo = await upload(ann);
    await db
      .updateTable('wardrobeItems')
      .set({ imageAssetId: photo.id })
      .where('id', '=', coat)
      .execute();
    await held(photo.id);
    await db
      .updateTable('wardrobeItems')
      .set({ imageAssetId: null })
      .where('id', '=', coat)
      .execute();
  });

  it('a discarded photo attached after all (a racing Update look)', async () => {
    const photo = await upload(ann);
    await repos.assets.discardUpload(ann, photo.id);
    const l = await look('Raced');
    await repos.looks.addImage(ann, l.id, photo.id);
    expect(await due()).not.toContain(photo.id);
    expect(await staleUploads.discard(ann, photo.id, SWEEP, files())).toBe('held');
    expect(await row(photo.id)).toBeDefined();
  });
});

describe('the reference list covers the schema', () => {
  const listed = new Set(
    Object.keys(ASSET_ID_COLUMNS).map((ref) => ref.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)),
  );

  it('every foreign key into app.assets', async () => {
    const { rows } = await sql<{ ref: string }>`
      select cl.relname || '.' || att.attname as ref
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class cl on cl.oid = c.conrelid
      cross join lateral unnest(c.conkey, c.confkey) as k(src, dst)
      join pg_catalog.pg_attribute att on att.attrelid = c.conrelid and att.attnum = k.src
      join pg_catalog.pg_attribute ref on ref.attrelid = c.confrelid and ref.attnum = k.dst
      where c.contype = 'f' and c.confrelid = 'app.assets'::regclass and ref.attname = 'id'
    `.execute(db);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((r) => r.ref).filter((r) => !listed.has(r))).toEqual([]);
  });

  it('every *_asset_id(s) column in schema app', async () => {
    const { rows } = await sql<{ ref: string }>`
      select table_name || '.' || column_name as ref
      from information_schema.columns
      where table_schema = 'app' and column_name ~ 'asset_ids?$'
    `.execute(db);
    expect(rows.map((r) => r.ref).filter((r) => !listed.has(r))).toEqual([]);
  });
});

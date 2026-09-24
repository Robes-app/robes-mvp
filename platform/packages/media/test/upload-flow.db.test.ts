import { createRepositories, createSystemRepositories } from '@robes/db';
import { createTestDb, createTestUser, deleteTestUsers } from '@robes/db/testing';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalDelivery } from '../src/delivery';
import { mediaKeys } from '../src/keys';
import { RenditionManifest, renditionKeys } from '../src/manifest';
import { processUpload } from '../src/process';
import { createMediaBucket, createMediaStorage } from '../src/storage';
import { ensureBucket } from './ensure-bucket';
import { LOCAL_S3 } from './local-s3';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
const bucket = createMediaBucket(LOCAL_S3);
const storage = createMediaStorage(bucket);
const delivery = createLocalDelivery(bucket);
const users: string[] = [];

beforeAll(() => ensureBucket(bucket));
afterAll(async () => {
  await deleteTestUsers(db, ...users);
  await db.destroy();
});

describe('upload → rendition → signed delivery (MinIO + Postgres)', () => {
  it('turns a presigned upload into ready, privately delivered renditions', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    users.push(alice, bob);
    const photo = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: '#335577' },
    })
      .jpeg()
      .toBuffer();

    const asset = await repos.assets.createPending(
      alice,
      { kind: 'wardrobe', contentType: 'image/jpeg', bytes: photo.byteLength },
      { quota: { metric: 'upload.image', cost: 1 } },
    );
    const key = mediaKeys.original(alice, asset.id);
    const upload = await storage.presignPut(key, {
      contentType: 'image/jpeg',
      bytes: photo.byteLength,
    });
    const put = await fetch(upload.url, { method: 'PUT', body: photo, headers: upload.headers });
    expect(put.status).toBe(200);

    expect(await processUpload({ storage, assets: system.assets }, key)).toMatchObject({
      status: 'ready',
    });
    expect(await processUpload({ storage, assets: system.assets }, key)).toMatchObject({
      status: 'skipped',
    });

    const row = await repos.assets.getForUser(alice, asset.id);
    expect(row).toMatchObject({ status: 'ready', width: 1200, height: 900 });
    expect(row?.blurhash).toBeTruthy();
    expect(await repos.assets.getForUser(bob, asset.id)).toBeUndefined();

    const keys = renditionKeys(alice, asset.id, RenditionManifest.parse(row?.renditions));
    expect(keys.renditions.map((r) => r.width)).toEqual([320, 640, 1080]);
    const avif = await fetch(await delivery.url(keys.renditions[0]?.avif ?? ''));
    expect(avif.status).toBe(200);
    expect(avif.headers.get('content-type')).toBe('image/avif');
    expect(avif.headers.get('cache-control')).toContain('private');

    const unsigned = new URL(await delivery.url(keys.master));
    unsigned.search = '';
    expect((await fetch(unsigned)).status).toBe(403);
  });
});

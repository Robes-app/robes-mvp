import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalDelivery } from '../src/delivery';
import { createMediaBucket, createMediaStorage } from '../src/storage';
import { ensureBucket } from './ensure-bucket';
import { LOCAL_S3 } from './local-s3';

const bucket = createMediaBucket(LOCAL_S3);
const storage = createMediaStorage(bucket);
const key = (): string => `test/${crypto.randomUUID()}/original`;

beforeAll(() => ensureBucket(bucket));

async function put(
  url: string,
  body: Uint8Array<ArrayBuffer>,
  contentType: string,
): Promise<number> {
  return (await fetch(url, { method: 'PUT', body, headers: { 'content-type': contentType } }))
    .status;
}

describe('presigned PUT (SEC-20)', () => {
  it('accepts exactly the signed type and length and nothing else', async () => {
    const k = key();
    const up = await storage.presignPut(k, { contentType: 'image/jpeg', bytes: 16 });
    expect(up.method).toBe('PUT');
    expect(up.headers).toEqual({ 'content-type': 'image/jpeg' });
    expect(up.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000);
    expect(new URL(up.url).searchParams.get('X-Amz-Expires')).toBe('300');

    expect(await put(up.url, new Uint8Array(17), 'image/jpeg')).toBe(403);
    expect(await put(up.url, new Uint8Array(15), 'image/jpeg')).toBe(403);
    expect(await put(up.url, new Uint8Array(16), 'image/png')).toBe(403);
    expect(await storage.head(k)).toBeNull();

    expect(await put(up.url, new Uint8Array(16), 'image/jpeg')).toBe(200);
    expect(await storage.head(k)).toEqual({ bytes: 16, contentType: 'image/jpeg' });
  });

  it('is bound to its exact key', async () => {
    const k = key();
    const up = await storage.presignPut(k, { contentType: 'image/png', bytes: 4 });
    const other = up.url.replace(encodeURI(k), encodeURI(key()));
    expect(await put(other, new Uint8Array(4), 'image/png')).toBe(403);
  });
});

describe('local delivery', () => {
  it('serves signed GETs and refuses unsigned ones', async () => {
    const k = key();
    await storage.putObject(k, new Uint8Array([1, 2, 3]), { contentType: 'image/webp' });
    const signed = await createLocalDelivery(bucket).url(k);
    const ok = await fetch(signed);
    expect(ok.status).toBe(200);
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));

    const unsigned = new URL(signed);
    unsigned.search = '';
    expect((await fetch(unsigned)).status).toBe(403);
  });

  it('reads, overwrites and deletes objects', async () => {
    const k = key();
    expect(await storage.getObject(k)).toBeNull();
    await storage.putObject(k, new Uint8Array([9]), { contentType: 'image/jpeg' });
    expect(await storage.getObject(k)).toEqual(new Uint8Array([9]));
    await storage.deleteObject(k);
    expect(await storage.getObject(k)).toBeNull();
  });
});

describe('deletePrefix', () => {
  it('deletes everything under a prefix and nothing next to it', async () => {
    const id = crypto.randomUUID();
    const body = new Uint8Array([1]);
    const opts = { contentType: 'application/octet-stream' };
    for (const k of ['a', 'b/c', 'b/d']) await storage.putObject(`test/${id}/${k}`, body, opts);
    await storage.putObject(`test/${id}-neighbour/keep`, body, opts);

    expect(await storage.deletePrefix(`test/${id}/`)).toBe(3);
    expect(await storage.head(`test/${id}/b/c`)).toBeNull();
    expect(await storage.head(`test/${id}-neighbour/keep`)).not.toBeNull();
    expect(await storage.deletePrefix(`test/${id}/`)).toBe(0);
  });

  it('refuses a prefix that could match a sibling', async () => {
    await expect(storage.deletePrefix('test/abc')).rejects.toThrow(/invalid prefix/);
    await expect(storage.deletePrefix('/')).rejects.toThrow(/invalid prefix/);
  });
});

describe('presignDownload', () => {
  it('downloads as an attachment and expires', async () => {
    const k = `test/${crypto.randomUUID()}/export.json`;
    await storage.putObject(k, new TextEncoder().encode('{"ok":true}'), {
      contentType: 'application/json',
    });
    const url = await storage.presignDownload(k, { filename: 'robes-data.json', expiresIn: 3600 });
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('3600');
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="robes-data.json"');
    expect(await res.json()).toEqual({ ok: true });
    await expect(storage.presignDownload(k, { filename: 'a"b', expiresIn: 60 })).rejects.toThrow();
  });
});

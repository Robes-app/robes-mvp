import { readFileSync } from 'node:fs';
import exif from 'exif-reader';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { detectImageFormat } from './detect';
import { mediaKeys } from './keys';
import { type AssetStore, processUpload } from './process';

type Sharp = ReturnType<typeof sharp>;

const USER = '11111111-1111-4111-8111-111111111111';
const HEIC = readFileSync(new URL('../test/fixtures/tiny.heic', import.meta.url));

function solid(width: number, height: number): Sharp {
  return sharp({ create: { width, height, channels: 3, background: '#c08040' } });
}

const jpegWithGps = (): Promise<Buffer> =>
  solid(3000, 2000)
    .jpeg()
    .withExif({
      IFD0: { Make: 'Robes' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '53/1 20/1 0/1' },
    })
    .toBuffer();

function harness(status = 'pending') {
  const objects = new Map<string, Uint8Array>();
  const rows = new Map<
    string,
    { userId: string | null; status: string; error?: string; crop?: unknown }
  >();
  const ready = new Map<string, Parameters<AssetStore['markReady']>[1]>();
  let puts = 0;
  const assets: AssetStore = {
    get: async (id) => rows.get(id),
    markReady: async (id, meta) => {
      ready.set(id, meta);
      rows.set(id, { userId: USER, status: 'ready' });
    },
    markFailed: async (id, error) => {
      rows.set(id, { userId: USER, status: 'failed', error });
    },
  };
  const storage = {
    getObject: async (key: string) => objects.get(key) ?? null,
    putObject: async (key: string, body: Uint8Array) => {
      puts += 1;
      objects.set(key, body);
    },
  };
  async function upload(bytes: Uint8Array, owner = USER, crop?: unknown) {
    const assetId = crypto.randomUUID();
    rows.set(assetId, { userId: owner, status, crop });
    const key = mediaKeys.original(USER, assetId);
    objects.set(key, bytes);
    return { assetId, key };
  }
  return { deps: { storage, assets }, objects, rows, ready, upload, puts: () => puts };
}

describe('detectImageFormat', () => {
  it('trusts magic bytes only', async () => {
    expect(detectImageFormat(await solid(40, 40).jpeg().toBuffer())).toBe('jpeg');
    expect(detectImageFormat(await solid(40, 40).png().toBuffer())).toBe('png');
    expect(detectImageFormat(await solid(40, 40).webp().toBuffer())).toBe('webp');
    expect(detectImageFormat(await solid(40, 40).avif().toBuffer())).toBe('avif');
    expect(detectImageFormat(HEIC)).toBe('heic');
    expect(detectImageFormat(new TextEncoder().encode('<svg xmlns="x"></svg>'))).toBeNull();
    expect(detectImageFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull();
  });
});

describe('processUpload', () => {
  it('writes a 2048 master and avif+webp renditions with no EXIF or GPS', async () => {
    const h = harness();
    const input = await jpegWithGps();
    expect(exif((await sharp(input).metadata()).exif as Buffer).GPSInfo).toBeDefined();
    const { assetId, key } = await h.upload(input);

    const result = await processUpload(h.deps, key);

    expect(result).toMatchObject({ status: 'ready', assetId });
    const meta = h.ready.get(assetId);
    expect(meta).toMatchObject({
      bucketKey: mediaKeys.master(USER, assetId),
      width: 2048,
      height: 1365,
      renditions: { v: 1, master: { width: 2048, height: 1365 }, widths: [320, 640, 1080, 1600] },
    });
    expect(meta?.blurhash).toMatch(/^[0-9A-Za-z#$%*+,-.:;=?@[\]^_{|}~]{20,}$/);

    const master = h.objects.get(mediaKeys.master(USER, assetId));
    const masterMeta = await sharp(master).metadata();
    expect(masterMeta.format).toBe('jpeg');
    expect(masterMeta.exif).toBeUndefined();
    for (const width of [320, 640, 1080, 1600]) {
      for (const format of ['avif', 'webp'] as const) {
        const out = await sharp(
          h.objects.get(mediaKeys.rendition(USER, assetId, width, format)),
        ).metadata();
        expect(out.width).toBe(width);
        expect(out.exif).toBeUndefined();
      }
    }
  });

  it('cuts a crop asset out of its photo before rendering (padded, never under 28%)', async () => {
    const h = harness();
    const photo = await solid(1000, 800).jpeg().toBuffer();
    const { assetId, key } = await h.upload(photo, USER, { x: 0.5, y: 0.5, w: 0.2, h: 0.25 });
    expect(await processUpload(h.deps, key)).toMatchObject({ status: 'ready', assetId });
    expect(h.ready.get(assetId)).toMatchObject({ width: 360, height: 328 });
  });

  it('applies EXIF orientation', async () => {
    const h = harness();
    const rotated = await solid(400, 200).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const { assetId, key } = await h.upload(rotated);
    await processUpload(h.deps, key);
    expect(h.ready.get(assetId)).toMatchObject({ width: 200, height: 400 });
    const master = await sharp(h.objects.get(mediaKeys.master(USER, assetId))).metadata();
    expect([master.width, master.height, master.orientation]).toEqual([200, 400, undefined]);
  });

  it('never upscales a small image', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(await solid(100, 80).png().toBuffer());
    await processUpload(h.deps, key);
    expect(h.ready.get(assetId)?.renditions).toEqual({
      v: 1,
      master: { width: 100, height: 80 },
      widths: [100],
    });
    const webp = await sharp(h.objects.get(mediaKeys.rendition(USER, assetId, 100, 'webp')))
      .metadata()
      .then((m) => m.width);
    expect(webp).toBe(100);
  });

  it('fails a non-image declared as a JPEG without writing anything', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(new TextEncoder().encode('not really a jpeg'));
    expect(await processUpload(h.deps, key)).toEqual({
      status: 'failed',
      assetId,
      reason: 'unsupported_type',
    });
    expect(h.rows.get(assetId)).toMatchObject({ status: 'failed', error: 'unsupported_type' });
    expect(h.puts()).toBe(0);
  });

  it('fails a truncated image and a too-small one', async () => {
    const h = harness();
    const jpeg = await solid(300, 300).jpeg().toBuffer();
    const truncated = await h.upload(jpeg.subarray(0, 200));
    expect(await processUpload(h.deps, truncated.key)).toMatchObject({ reason: 'decode_failed' });
    const tiny = await h.upload(await solid(20, 200).png().toBuffer());
    expect(await processUpload(h.deps, tiny.key)).toMatchObject({ reason: 'too_small' });
  });

  it('converts HEIC to JPEG, or fails clearly where libvips has no HEVC decoder', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(HEIC);
    const result = await processUpload(h.deps, key);
    if (sharp.format.heif.input.fileSuffix?.includes('.heic')) {
      expect(result).toMatchObject({ status: 'ready' });
      const master = await sharp(h.objects.get(mediaKeys.master(USER, assetId))).metadata();
      expect(master.format).toBe('jpeg');
    } else {
      expect(result).toEqual({ status: 'failed', assetId, reason: 'heic_unsupported' });
    }
  });

  it('is idempotent and ignores keys it does not own', async () => {
    const h = harness();
    const { key } = await h.upload(await solid(400, 300).jpeg().toBuffer());
    expect(await processUpload(h.deps, key)).toMatchObject({ status: 'ready' });
    const writes = h.puts();
    expect(await processUpload(h.deps, key)).toEqual({ status: 'skipped', reason: 'not_pending' });
    expect(h.puts()).toBe(writes);

    expect(await processUpload(h.deps, 'generated/x/y/0.png')).toMatchObject({
      reason: 'not_an_upload',
    });
    expect(
      await processUpload(h.deps, mediaKeys.original(USER, crypto.randomUUID())),
    ).toMatchObject({ reason: 'unknown_asset' });
    const other = await h.upload(
      await solid(400, 300).jpeg().toBuffer(),
      '33333333-3333-4333-8333-333333333333',
    );
    expect(await processUpload(h.deps, other.key)).toMatchObject({ reason: 'owner_mismatch' });
  });

  it('lets storage errors propagate so the invoker retries', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(await solid(400, 300).jpeg().toBuffer());
    const deps = {
      ...h.deps,
      storage: {
        ...h.deps.storage,
        putObject: async () => {
          throw new Error('SlowDown');
        },
      },
    };
    await expect(processUpload(deps, key)).rejects.toThrow('SlowDown');
    expect(h.rows.get(assetId)?.status).toBe('pending');
  });
});

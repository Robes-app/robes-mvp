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
    {
      userId: string | null;
      status: string;
      error?: string;
      crop?: unknown;
      sourceAssetId?: string | null;
    }
  >();
  const ready = new Map<string, Parameters<AssetStore['markReady']>[1]>();
  const cutouts = new Set<string>();
  let puts = 0;
  const assets: AssetStore = {
    get: async (id) => rows.get(id),
    markReady: async (id, meta) => {
      if (!rows.has(id)) return false;
      ready.set(id, meta);
      rows.set(id, { userId: USER, status: 'ready' });
      return true;
    },
    markFailed: async (id, error) => {
      rows.set(id, { userId: USER, status: 'failed', error });
    },
    markCutout: async (id) => {
      if (!rows.has(id)) return false;
      cutouts.add(id);
      return true;
    },
  };
  const storage = {
    getObject: async (key: string) => objects.get(key) ?? null,
    putObject: async (key: string, body: Uint8Array) => {
      puts += 1;
      objects.set(key, body);
    },
    deleteObject: async (key: string) => {
      objects.delete(key);
    },
    deletePrefix: async (prefix: string) => {
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix));
      for (const k of keys) objects.delete(k);
      return keys.length;
    },
  };
  async function upload(bytes: Uint8Array, owner = USER, crop?: unknown, sourceAssetId?: string) {
    const assetId = crypto.randomUUID();
    rows.set(assetId, { userId: owner, status, crop, sourceAssetId });
    const key = mediaKeys.original(USER, assetId);
    objects.set(key, bytes);
    return { assetId, key };
  }
  return { deps: { storage, assets }, objects, rows, ready, cutouts, upload, puts: () => puts };
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

  // A photo read waits for the master, not for `ready`: it must land before any rendition.
  it('stores the master before it renders the renditions', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(await solid(1200, 900).jpeg().toBuffer());
    const order: string[] = [];
    const deps = {
      ...h.deps,
      storage: {
        ...h.deps.storage,
        putObject: async (k: string, body: Uint8Array) => {
          order.push(k);
          await h.deps.storage.putObject(k, body);
        },
      },
    };
    expect(await processUpload(deps, key)).toMatchObject({ status: 'ready', assetId });
    expect(order[0]).toBe(mediaKeys.master(USER, assetId));
    expect(order).toHaveLength(1 + 3 * 2);
  });

  it('cuts a crop asset out of its photo before rendering (padded, never under 28%)', async () => {
    const h = harness();
    const photo = await solid(1000, 800).jpeg().toBuffer();
    const { assetId, key } = await h.upload(photo, USER, { x: 0.5, y: 0.5, w: 0.2, h: 0.25 });
    expect(await processUpload(h.deps, key)).toMatchObject({ status: 'ready', assetId });
    expect(h.ready.get(assetId)).toMatchObject({ width: 360, height: 328 });
  });

  describe('a piece cut out of its photograph', () => {
    const SOURCE = '33333333-3333-4333-8333-333333333333';
    const box = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
    const plan = { ...box, cut: { route: 'on-device', index: 0, boxes: [box] } };
    // The lift for a 1000×800 photo: one item in the middle of the box, a strap at its corner.
    const item = (width: number, height: number, left: number, top: number) => ({
      input: {
        create: { width, height, channels: 3 as const, background: { r: 16, g: 255, b: 0 } },
      },
      left,
      top,
    });
    const lift = () =>
      sharp({ create: { width: 500, height: 400, channels: 3, background: '#000000' } })
        .composite([item(200, 140, 150, 140), item(30, 20, 150, 120)])
        .png()
        .toBuffer();

    it('stores the cutout beside the rectangle and says so', async () => {
      const h = harness();
      h.objects.set(mediaKeys.lift(USER, SOURCE), await lift());
      const events: unknown[] = [];
      const photo = await solid(1000, 800).jpeg().toBuffer();
      const { assetId, key } = await h.upload(photo, USER, plan, SOURCE);
      const deps = { ...h.deps, onCutout: async (e: unknown) => void events.push(e) };
      expect(await processUpload(deps, key)).toMatchObject({ status: 'ready', assetId });
      // The rectangle, as ever…
      expect(h.objects.has(mediaKeys.master(USER, assetId))).toBe(true);
      expect(h.ready.get(assetId)).toMatchObject({ hasCutout: true });
      // …and the piece alone, see-through, with its twin on white for the drawing step.
      const cutout = await sharp(h.objects.get(mediaKeys.cutout(USER, assetId))).metadata();
      expect([cutout.format, cutout.hasAlpha, cutout.width, cutout.height]).toEqual([
        'webp',
        true,
        400,
        320,
      ]);
      const reference = await sharp(
        h.objects.get(mediaKeys.cutoutReference(USER, assetId)),
      ).metadata();
      expect([reference.format, reference.hasAlpha]).toEqual(['jpeg', false]);
      expect(events).toEqual([
        {
          userId: USER,
          assetId,
          outcome: {
            route: 'on-device',
            status: 'ok',
            shared: false,
            latencyMs: expect.any(Number),
          },
        },
      ]);
    });

    it('keeps the rectangle alone when the lift is missing, bad or misses the box', async () => {
      for (const [bytes, reason] of [
        [null, 'no_lift'],
        [new TextEncoder().encode('not a png'), 'bad_lift'],
        [
          await sharp({ create: { width: 500, height: 400, channels: 3, background: '#000000' } })
            .png()
            .toBuffer(),
          'miss',
        ],
      ] as const) {
        const h = harness();
        if (bytes) h.objects.set(mediaKeys.lift(USER, SOURCE), bytes);
        const events: Array<{ outcome: unknown }> = [];
        const photo = await solid(1000, 800).jpeg().toBuffer();
        const { assetId, key } = await h.upload(photo, USER, plan, SOURCE);
        const deps = {
          ...h.deps,
          onCutout: async (e: { outcome: unknown }) => void events.push(e),
        };
        expect(await processUpload(deps, key)).toMatchObject({ status: 'ready', assetId });
        expect(h.ready.get(assetId)?.hasCutout).toBeUndefined();
        expect(h.objects.has(mediaKeys.cutout(USER, assetId))).toBe(false);
        expect(h.objects.has(mediaKeys.master(USER, assetId))).toBe(true);
        expect(events[0]?.outcome).toMatchObject({ status: 'fallback', reason });
      }
    });

    it('answers a cut request: a photo that is one piece, cut out of itself', async () => {
      const h = harness('ready');
      const { assetId } = await h.upload(await solid(1000, 800).jpeg().toBuffer());
      const request = mediaKeys.cutRequest(USER, assetId);
      h.objects.set(request, await solid(1000, 800).jpeg().toBuffer());
      h.objects.set(mediaKeys.lift(USER, assetId), await lift());
      const events: Array<{ outcome: unknown }> = [];
      const deps = { ...h.deps, onCutout: async (e: { outcome: unknown }) => void events.push(e) };
      expect(await processUpload(deps, request)).toEqual({ status: 'cut', assetId, cutout: true });
      expect(h.cutouts.has(assetId)).toBe(true);
      const cutout = await sharp(h.objects.get(mediaKeys.cutout(USER, assetId))).metadata();
      expect([cutout.format, cutout.hasAlpha]).toEqual(['webp', true]);
      expect(h.objects.has(mediaKeys.cutoutReference(USER, assetId))).toBe(true);
      expect(events[0]?.outcome).toMatchObject({ route: 'on-device', status: 'ok' });
      // The photograph itself is untouched: nothing re-rendered, no status changed.
      expect(h.rows.get(assetId)?.status).toBe('ready');
      expect(h.ready.has(assetId)).toBe(false);
    });

    it('a cut request with no lift, or for a photo that is not hers, stores nothing', async () => {
      const h = harness('ready');
      const { assetId } = await h.upload(await solid(1000, 800).jpeg().toBuffer());
      const request = mediaKeys.cutRequest(USER, assetId);
      h.objects.set(request, await solid(1000, 800).jpeg().toBuffer());
      expect(await processUpload(h.deps, request)).toEqual({
        status: 'cut',
        assetId,
        cutout: false,
      });
      expect(h.cutouts.size).toBe(0);
      const other = await h.upload(await solid(100, 80).jpeg().toBuffer(), 'someone-else');
      const theirs = mediaKeys.cutRequest(USER, other.assetId);
      h.objects.set(theirs, await solid(100, 80).jpeg().toBuffer());
      expect(await processUpload(h.deps, theirs)).toEqual({
        status: 'skipped',
        reason: 'owner_mismatch',
      });
    });

    it('a ledger that fails never fails the render, and a crop with no plan tries nothing', async () => {
      const h = harness();
      h.objects.set(mediaKeys.lift(USER, SOURCE), await lift());
      const photo = await solid(1000, 800).jpeg().toBuffer();
      const first = await h.upload(photo, USER, plan, SOURCE);
      const failing = {
        ...h.deps,
        onCutout: async () => {
          throw new Error('ledger down');
        },
      };
      expect(await processUpload(failing, first.key)).toMatchObject({ status: 'ready' });
      let asked = 0;
      const plain = await h.upload(photo, USER, box, SOURCE);
      const counting = {
        ...h.deps,
        onCutout: async () => {
          asked += 1;
        },
      };
      expect(await processUpload(counting, plain.key)).toMatchObject({ status: 'ready' });
      expect(asked).toBe(0);
      expect(h.objects.has(mediaKeys.cutout(USER, plain.assetId))).toBe(false);
    });
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

  it('removes what it wrote when the asset was discarded while it rendered', async () => {
    const h = harness();
    const { assetId, key } = await h.upload(await solid(400, 300).jpeg().toBuffer());
    const deps = {
      ...h.deps,
      storage: {
        ...h.deps.storage,
        // The row goes as the renditions land (uploads.discard or the stale-upload sweep).
        putObject: async (k: string, body: Uint8Array) => {
          h.rows.delete(assetId);
          await h.deps.storage.putObject(k, body);
        },
      },
    };
    expect(await processUpload(deps, key)).toEqual({ status: 'skipped', reason: 'unknown_asset' });
    expect([...h.objects.keys()].filter((k) => k.includes(assetId))).toEqual([]);
    expect(h.ready.has(assetId)).toBe(false);
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

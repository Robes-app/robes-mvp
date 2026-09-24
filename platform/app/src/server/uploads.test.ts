import { generateKeyPairSync } from 'node:crypto';
import { ApiError } from '@robes/api';
import { QuotaExceeded, type UserId, verifiedUserId } from '@robes/db';
import { mediaKeys } from '@robes/media';
import { createCloudFrontDelivery, type SessionCookie } from '@robes/media/delivery';
import { describe, expect, it, vi } from 'vitest';
import {
  completeUpload,
  createUpload,
  getAsset,
  startMediaSession,
  type UploadDeps,
} from './uploads';

const ALICE = verifiedUserId('11111111-1111-4111-8111-111111111111');
const BOB = verifiedUserId('22222222-2222-4222-8222-222222222222');
const ASSET = '33333333-3333-4333-8333-333333333333';

type Row = NonNullable<Awaited<ReturnType<UploadDeps['assets']['getForUser']>>>;

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: ASSET,
    kind: 'wardrobe',
    status: 'pending',
    contentType: 'image/jpeg',
    width: null,
    height: null,
    blurhash: null,
    bytes: 1000,
    renditions: {},
    hasCutout: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakes(owned: Row | undefined = row(), stored = true) {
  const deps = {
    assets: {
      createPending: vi.fn(async () => ({ id: ASSET, kind: 'wardrobe', status: 'pending' })),
      getForUser: vi.fn(async (userId: UserId) => (userId === ALICE ? owned : undefined)),
    },
    storage: {
      presignPut: vi.fn(async (key: string) => ({
        method: 'PUT' as const,
        url: `http://s3.test/${key}?sig`,
        headers: { 'content-type': 'image/jpeg' },
        expiresAt: new Date('2026-09-24T10:05:00Z'),
      })),
      head: vi.fn(async () => (stored ? { bytes: 1000, contentType: 'image/jpeg' } : null)),
    },
    delivery: {
      mode: 'local' as const,
      url: vi.fn(async (key: string) => `http://s3.test/${key}?signed`),
      shareUrl: vi.fn(async (key: string) => `https://media.test/${key}?share`),
      sessionCookies: vi.fn((): SessionCookie[] => []),
    },
    onUploaded: vi.fn(),
  };
  return deps satisfies UploadDeps;
}

async function apiError(p: Promise<unknown>): Promise<ApiError> {
  const err = await p.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  return err as ApiError;
}

describe('createUpload', () => {
  it('charges quota, creates the pending row and presigns its exact original key', async () => {
    const deps = fakes();
    const out = await createUpload(deps, ALICE, {
      kind: 'wardrobe',
      contentType: 'image/jpeg',
      bytes: 1000,
    });
    expect(deps.assets.createPending).toHaveBeenCalledWith(
      ALICE,
      { kind: 'wardrobe', contentType: 'image/jpeg', bytes: 1000 },
      { quota: { metric: 'upload.image', cost: 1 } },
    );
    expect(deps.storage.presignPut).toHaveBeenCalledWith(mediaKeys.original(ALICE, ASSET), {
      contentType: 'image/jpeg',
      bytes: 1000,
    });
    expect(out).toEqual({
      assetId: ASSET,
      upload: {
        method: 'PUT',
        url: `http://s3.test/${mediaKeys.original(ALICE, ASSET)}?sig`,
        headers: { 'content-type': 'image/jpeg' },
        expiresAt: '2026-09-24T10:05:00.000Z',
      },
    });
  });

  it('maps an exhausted quota to 429 quota_exceeded without presigning', async () => {
    const deps = fakes();
    deps.assets.createPending.mockRejectedValueOnce(
      new QuotaExceeded(new Date(Date.now() + 3600_000)),
    );
    const err = await apiError(
      createUpload(deps, ALICE, { kind: 'headshot', contentType: 'image/png', bytes: 5 }),
    );
    expect(err.code).toBe('quota_exceeded');
    expect(err.extra.retryAfterSeconds).toBeGreaterThan(3500);
    expect(deps.storage.presignPut).not.toHaveBeenCalled();
  });
});

describe('getAsset', () => {
  it('is 404 for another user and for deleted assets', async () => {
    expect((await apiError(getAsset(fakes(), BOB, ASSET))).code).toBe('not_found');
    const deleted = fakes(row({ status: 'deleted' }));
    expect((await apiError(getAsset(deleted, ALICE, ASSET))).code).toBe('not_found');
  });

  it('has no URLs while pending', async () => {
    expect(await getAsset(fakes(), ALICE, ASSET)).toMatchObject({
      status: 'pending',
      master: null,
      renditions: [],
    });
  });

  it('signs every rendition for the owner once ready', async () => {
    const ready = row({
      status: 'ready',
      width: 800,
      height: 600,
      blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
      renditions: { v: 1, master: { width: 800, height: 600 }, widths: [320, 640] },
    });
    const asset = await getAsset(fakes(ready), ALICE, ASSET);
    const signed = (w: number, f: 'avif' | 'webp') =>
      `http://s3.test/${mediaKeys.rendition(ALICE, ASSET, w, f)}?signed`;
    expect(asset).toEqual({
      id: ASSET,
      kind: 'wardrobe',
      status: 'ready',
      width: 800,
      height: 600,
      blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
      master: `http://s3.test/${mediaKeys.master(ALICE, ASSET)}?signed`,
      renditions: [
        { width: 320, avif: signed(320, 'avif'), webp: signed(320, 'webp') },
        { width: 640, avif: signed(640, 'avif'), webp: signed(640, 'webp') },
      ],
    });
  });
});

describe('completeUpload', () => {
  it('is a conflict until the object is in the bucket', async () => {
    const deps = fakes(row(), false);
    expect((await apiError(completeUpload(deps, ALICE, ASSET))).code).toBe('conflict');
    expect(deps.onUploaded).not.toHaveBeenCalled();
  });

  it('triggers rendition for a stored pending upload, only for its owner', async () => {
    const deps = fakes();
    expect((await apiError(completeUpload(deps, BOB, ASSET))).code).toBe('not_found');
    expect(await completeUpload(deps, ALICE, ASSET)).toMatchObject({ status: 'pending' });
    expect(deps.onUploaded).toHaveBeenCalledWith(mediaKeys.original(ALICE, ASSET));
  });

  it('does nothing more once the asset is processed', async () => {
    const deps = fakes(row({ status: 'failed' }));
    expect(await completeUpload(deps, ALICE, ASSET)).toMatchObject({ status: 'failed' });
    expect(deps.storage.head).not.toHaveBeenCalled();
    expect(deps.onUploaded).not.toHaveBeenCalled();
  });
});

describe('startMediaSession', () => {
  it('is a no-op in local mode', () => {
    const setCookie = vi.fn();
    expect(startMediaSession(fakes(), ALICE, setCookie)).toEqual({ mode: 'local' });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('sets CloudFront cookies scoped to the caller’s prefix', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const delivery = createCloudFrontDelivery({
      origin: 'https://media.example.test',
      keyPairId: 'KTEST',
      privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
    });
    const set: SessionCookie[] = [];
    const out = startMediaSession({ ...fakes(), delivery }, ALICE, (c) => set.push(c));
    expect(out.mode).toBe('cookies');
    expect(set).toHaveLength(3);
    expect(new Set(set.map((c) => c.path))).toEqual(new Set([`/media/${ALICE}/`]));
  });
});

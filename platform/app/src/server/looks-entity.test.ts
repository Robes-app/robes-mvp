import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '22222222-2222-4222-8222-222222222222';
const FRAME = '33333333-3333-4333-8333-333333333333';
const PHOTO = '44444444-4444-4444-8444-444444444444';
const NOW = Date.parse('2026-10-15T12:00:00Z');

const assets = new Map<string, { id: string; status: 'pending' | 'ready' | 'failed' }>();
const repos = {
  looks: { piecesFor: vi.fn(async () => []), wearStats: vi.fn(async () => []) },
  assets: {
    getManyForUser: vi.fn(async (_u: unknown, ids: string[]) =>
      ids.flatMap((id) => (assets.has(id) ? [assets.get(id)] : [])),
    ),
  },
  wardrobe: { get: vi.fn(async () => undefined) },
};
vi.mock('./db', () => ({ repos }));
vi.mock('./media', () => ({ mediaDelivery: {} }));
vi.mock('./wardrobe', () => ({ toPieces: vi.fn(async () => []) }));
vi.mock('./asset-urls', () => ({
  toImage: vi.fn(async (_d: unknown, _u: unknown, a: { id: string; status: string }) => ({
    assetId: a.id,
    status: a.status,
    width: null,
    height: null,
    blurhash: null,
    renditions:
      a.status === 'ready'
        ? [{ width: 320, avif: 'https://m.test/a', webp: 'https://m.test/w' }]
        : [],
  })),
}));

const { toLooks } = await import('./looks-entity');

const row = (o: Record<string, unknown> = {}) =>
  ({
    id: LOOK,
    name: 'Garden party',
    nameProvisional: true,
    note: null,
    source: 'generated',
    originLookId: null,
    climateBand: 'year_round',
    renderAssetId: null,
    renderStatus: null,
    renderKey: null,
    renderClaimedAt: null,
    status: 'suggested',
    anchorPieceId: null,
    setId: null,
    setIndex: 0,
    frameAssetId: null,
    frameKey: null,
    proposals: null,
    styling: null,
    edits: null,
    photoAssetId: null,
    recordImage: null,
    dateHint: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...o,
  }) as never;

beforeEach(() => assets.clear());

describe('a look’s frame', () => {
  it('stays pending while a job draws it, and lets go of an abandoned claim', async () => {
    const drawing = row({
      renderKey: 'frame:k1',
      renderStatus: 'pending',
      renderClaimedAt: new Date(NOW - 60_000),
    });
    expect((await toLooks(USER, [drawing], NOW))[0]).toMatchObject({
      framePending: true,
      image: null,
    });
    const abandoned = row({
      renderKey: 'frame:k1',
      renderStatus: 'pending',
      renderClaimedAt: new Date(NOW - 11 * 60_000),
    });
    expect((await toLooks(USER, [abandoned], NOW))[0]?.framePending).toBe(false);
  });

  it('stays pending until its renditions are made (AWS renders them later, from the S3 event)', async () => {
    assets.set(FRAME, { id: FRAME, status: 'pending' });
    // The job has landed the frame (the row says ready) but the renditions haven't run yet.
    const landed = row({ frameAssetId: FRAME, renderKey: 'frame:k1', renderStatus: 'ready' });
    const [early] = await toLooks(USER, [landed], NOW);
    expect(early).toMatchObject({ frame: true, framePending: true });
    expect(early?.image?.renditions).toEqual([]);
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    const [later] = await toLooks(USER, [landed], NOW);
    expect(later).toMatchObject({ framePending: false });
    expect(later?.image?.renditions).toHaveLength(1);
  });

  it('gives way to her photograph when the frame’s renditions failed', async () => {
    assets.set(FRAME, { id: FRAME, status: 'failed' });
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    const [look] = await toLooks(
      USER,
      [row({ frameAssetId: FRAME, photoAssetId: PHOTO, renderStatus: 'ready' })],
      NOW,
    );
    expect(look).toMatchObject({ framePending: false, image: { assetId: PHOTO } });
  });
});

describe('the record: her photograph or her model', () => {
  it('leads with her photograph until she picks, then shows the one she picked', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    const both = { frameAssetId: FRAME, photoAssetId: PHOTO, renderStatus: 'ready' };
    const [unset] = await toLooks(USER, [row(both)], NOW);
    expect(unset).toMatchObject({
      record: 'photo',
      image: { assetId: PHOTO },
      photo: { assetId: PHOTO },
      model: { assetId: FRAME },
    });
    const [model] = await toLooks(USER, [row({ ...both, recordImage: 'model' })], NOW);
    expect(model).toMatchObject({ record: 'model', image: { assetId: FRAME } });
  });

  it('is Robes’ picture while she has no photograph, whatever was picked', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    const [look] = await toLooks(USER, [row({ frameAssetId: FRAME, recordImage: 'photo' })], NOW);
    expect(look).toMatchObject({ photo: null, image: { assetId: FRAME } });
  });
});

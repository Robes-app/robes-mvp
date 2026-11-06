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
  looks: {
    piecesFor: vi.fn(async () => []),
    wearStats: vi.fn(async () => []),
    pinnedDays: vi.fn(async (): Promise<{ lookId: string | null; dayDate: string }[]> => []),
    imagesFor: vi.fn(
      async (): Promise<{ id: string; lookId: string; assetId: string; position: number }[]> => [],
    ),
  },
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
const { frameKey } = await import('@robes/core/looks');
const { rackHash } = await import('./render-key');

const row = (o: Record<string, unknown> = {}) =>
  ({
    id: LOOK,
    name: 'Garden party',
    nameProvisional: true,
    note: null,
    source: 'generated',
    originLookId: null,
    climateBand: 'year_round',
    seasons: [],
    renderAssetId: null,
    renderStatus: null,
    renderKey: null,
    renderClaimedAt: null,
    stoodOn: null,
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

beforeEach(() => {
  assets.clear();
  repos.looks.imagesFor.mockResolvedValue([]);
});

const IMG_1 = '55555555-5555-4555-8555-555555555555';
const IMG_2 = '66666666-6666-4666-8666-666666666666';

// The stack (Felix rebuild D13): her photographs lead `photo`; one whose renditions failed drops out.
describe('a look’s image stack', () => {
  it('reads her photographs in stack order, the first as the photograph', async () => {
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    assets.set(IMG_2, { id: IMG_2, status: 'ready' });
    repos.looks.imagesFor.mockResolvedValue([
      { id: IMG_1, lookId: LOOK, assetId: IMG_2, position: 0 },
      { id: IMG_2, lookId: LOOK, assetId: PHOTO, position: 1 },
    ]);
    const [look] = await toLooks(USER, [row({ photoAssetId: IMG_2 })], NOW);
    expect(look?.images.map((i) => [i.id, i.image.assetId, i.position])).toEqual([
      [IMG_1, IMG_2, 0],
      [IMG_2, PHOTO, 1],
    ]);
    expect(look).toMatchObject({ photo: { assetId: IMG_2 }, record: 'photo' });
  });

  it('drops a photograph whose renditions failed, and falls back to the row’s own photograph', async () => {
    assets.set(IMG_2, { id: IMG_2, status: 'failed' });
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    repos.looks.imagesFor.mockResolvedValue([
      { id: IMG_1, lookId: LOOK, assetId: IMG_2, position: 0 },
    ]);
    const [look] = await toLooks(USER, [row({ photoAssetId: PHOTO })], NOW);
    expect(look?.images).toEqual([]);
    expect(look?.photo?.assetId).toBe(PHOTO);
  });

  it('keeps another look’s photographs out', async () => {
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    repos.looks.imagesFor.mockResolvedValue([
      { id: IMG_1, lookId: FRAME, assetId: PHOTO, position: 0 },
    ]);
    const [look] = await toLooks(USER, [row()], NOW);
    expect(look?.images).toEqual([]);
    expect(look?.photo).toBeNull();
  });
});

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

// The picture is stale once the rack it was drawn for differs from the rack now (plan 2026-11-03).
describe('a stale picture', () => {
  it('reads stale when the frame was drawn for another rack', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    const current = frameKey([], [], {});
    const fresh = row({ frameAssetId: FRAME, frameKey: current, renderStatus: 'ready' });
    expect((await toLooks(USER, [fresh], NOW))[0]?.pictureStale).toBe(false);
    const stale = row({ frameAssetId: FRAME, frameKey: 'other', renderStatus: 'ready' });
    expect((await toLooks(USER, [stale], NOW))[0]?.pictureStale).toBe(true);
  });

  it('reads stale when the render on her model was for another rack', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    const hash = rackHash([], {});
    const fresh = row({
      renderAssetId: FRAME,
      renderKey: `twin:abc:${hash}`,
      renderStatus: 'ready',
    });
    expect((await toLooks(USER, [fresh], NOW))[0]?.pictureStale).toBe(false);
    const stale = row({ renderAssetId: FRAME, renderKey: 'twin:abc:other', renderStatus: 'ready' });
    expect((await toLooks(USER, [stale], NOW))[0]?.pictureStale).toBe(true);
    // No picture yet: nothing to be stale.
    expect((await toLooks(USER, [row()], NOW))[0]?.pictureStale).toBe(false);
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

describe('the days a look is pinned on', () => {
  it('lists each day once, earliest first, and none for a look on no day', async () => {
    repos.looks.pinnedDays.mockResolvedValueOnce([
      { lookId: LOOK, dayDate: '2026-10-20' },
      { lookId: LOOK, dayDate: '2026-10-20' },
      { lookId: LOOK, dayDate: '2026-10-22' },
    ]);
    const [look] = await toLooks(USER, [row({ status: 'saved' })], NOW);
    expect(look?.pinnedOn).toEqual(['2026-10-20', '2026-10-22']);
    const [none] = await toLooks(USER, [row({ status: 'saved' })], NOW);
    expect(none?.pinnedOn).toEqual([]);
  });
});

describe('the Robes model tag', () => {
  it('follows what Robes’ picture stood on, never her account', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    const robes = row({ frameAssetId: FRAME, renderStatus: 'ready', stoodOn: 'robes' });
    const twin = row({ frameAssetId: FRAME, renderStatus: 'ready', stoodOn: 'twin' });
    const before = row({ frameAssetId: FRAME, renderStatus: 'ready' });
    const [a, b, c] = await toLooks(USER, [robes, twin, before], NOW);
    expect(a?.onRobesModel).toBe(true);
    expect(b?.onRobesModel).toBe(false);
    // A frame from before the column says nothing: no tag.
    expect(c?.onRobesModel).toBe(false);
  });

  it('reads a render’s key when the row has no record, and stands down behind her photograph', async () => {
    assets.set(FRAME, { id: FRAME, status: 'ready' });
    assets.set(PHOTO, { id: PHOTO, status: 'ready' });
    const render = row({ renderAssetId: FRAME, renderKey: 'w-r2@v1:rack', renderStatus: 'ready' });
    const hers = row({ renderAssetId: FRAME, renderKey: 'twin:k:rack', renderStatus: 'ready' });
    const behind = row({
      renderAssetId: FRAME,
      renderKey: 'w-r2@v1:rack',
      renderStatus: 'ready',
      photoAssetId: PHOTO,
    });
    const [a, b, c] = await toLooks(USER, [render, hers, behind], NOW);
    expect(a?.onRobesModel).toBe(true);
    expect(b?.onRobesModel).toBe(false);
    expect(c?.onRobesModel).toBe(false);
  });
});

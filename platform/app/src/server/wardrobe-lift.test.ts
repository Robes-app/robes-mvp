import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LIFTED = '33333333-3333-4333-8333-333333333333';
const PLAIN = '44444444-4444-4444-8444-444444444444';

const mediaStorage = { head: vi.fn(async (_key: string): Promise<object | null> => null) };
const repos = {
  capacity: { isExhausted: vi.fn(async () => false) },
  assets: {
    getManyForUser: vi.fn(async (_u: string, ids: string[]) =>
      ids.map((id) => ({ id, kind: 'wardrobe', status: 'pending' })),
    ),
  },
  wardrobe: {
    byImageAssets: vi.fn(async () => []),
    create: vi.fn(async (_u: string, p: { imageAssetId: string }) => ({
      id: `piece-${p.imageAssetId}`,
      imageAssetId: p.imageAssetId,
    })),
    remove: vi.fn(async () => true),
    wearCounts: vi.fn(async () => new Map()),
    wearTags: vi.fn(async () => new Map()),
  },
};
const createAndEnqueueJob = vi.fn(async (..._args: unknown[]) => ({ jobId: 'job' }));
vi.mock('./media', () => ({ mediaStorage, mediaDelivery: {} }));
vi.mock('./db', () => ({ repos }));
vi.mock('./jobs', () => ({ createAndEnqueueJob }));

const { createBatch, liftedWith } = await import('./wardrobe');

beforeEach(() => vi.clearAllMocks());

// Cutout brief: her iPhone sends what it lifted beside the photo (uploads/…/lift), and a read
// asks for cutouts only when that file is there.
describe('liftedWith', () => {
  it('is true only when the lift is beside her photo', async () => {
    mediaStorage.head.mockResolvedValueOnce({ bytes: 4096 });
    expect(await liftedWith(USER, LIFTED)).toBe(true);
    expect(mediaStorage.head).toHaveBeenCalledWith(`uploads/${USER}/${LIFTED}/lift`);
    expect(await liftedWith(USER, PLAIN)).toBe(false);
  });

  it('reads storage that cannot say as no lift', async () => {
    mediaStorage.head.mockRejectedValueOnce(new Error('403'));
    expect(await liftedWith(USER, LIFTED)).toBe(false);
  });
});

// Home's single-photo add and onboarding (Annie, 22 Nov): the single read asks for a cutout too.
describe('createBatch', () => {
  it('tells each read whether its photo came with a lift', async () => {
    mediaStorage.head.mockImplementation(async (key: string) =>
      key.includes(LIFTED) ? { bytes: 4096 } : null,
    );
    // The pieces it answers with are built from real rows; only what it enqueues is checked here.
    await createBatch(USER, [LIFTED, PLAIN]).catch(() => {});
    expect(
      createAndEnqueueJob.mock.calls.map((call) => (call[1] as { input: unknown }).input),
    ).toEqual([{ pieceId: `piece-${LIFTED}`, lifted: true }, { pieceId: `piece-${PLAIN}` }]);
  });
});

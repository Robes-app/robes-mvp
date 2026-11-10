import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const CLOSE_UP = '33333333-3333-4333-8333-333333333333';
const repos = {
  capacity: { isExhausted: vi.fn(async () => false) },
  assets: {
    getForUser: vi.fn(
      async (_u: unknown, id: string): Promise<unknown> => ({
        id,
        kind: 'headshot',
        status: 'ready',
      }),
    ),
  },
};
const startJob = vi.fn(async () => ({ jobId: 'read-job', status: 'queued' }));
const drawTwinFromSelfie = vi.fn(async (): Promise<void> => {});
const warn = vi.fn();
vi.mock('./db', () => ({ repos }));
vi.mock('./jobs', () => ({ startJob }));
vi.mock('./model', () => ({ drawTwinFromSelfie }));
vi.mock('./logger', () => ({ logger: { warn } }));

const { analyseStyle } = await import('./style-profile');
const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const req = new Request('https://robes.test/api/v1/me/style/analyse', { method: 'POST' });

beforeEach(() => vi.clearAllMocks());

describe('reading her photo', () => {
  it('starts her selfie’s twin with its colour read, and answers with the read', async () => {
    await expect(analyseStyle(USER, req, { kind: 'colour', assetId: CLOSE_UP })).resolves.toEqual({
      jobId: 'read-job',
      status: 'queued',
    });
    expect(drawTwinFromSelfie).toHaveBeenCalledWith(USER, req, {
      closeUpAssetId: CLOSE_UP,
      readJobId: 'read-job',
    });
  });

  it('never fails the read over the twin, and a silhouette read draws no twin', async () => {
    drawTwinFromSelfie.mockRejectedValueOnce(new Error('down'));
    await expect(analyseStyle(USER, req, { kind: 'colour', assetId: CLOSE_UP })).resolves.toEqual({
      jobId: 'read-job',
      status: 'queued',
    });
    expect(warn).toHaveBeenCalled();
    repos.assets.getForUser.mockResolvedValueOnce({
      id: CLOSE_UP,
      kind: 'full_length',
      status: 'ready',
    });
    await analyseStyle(USER, req, { kind: 'silhouette', assetId: CLOSE_UP });
    expect(drawTwinFromSelfie).toHaveBeenCalledTimes(1);
  });

  it('draws no twin from a photo that is not hers to read', async () => {
    repos.assets.getForUser.mockResolvedValueOnce(undefined);
    await expect(analyseStyle(USER, req, { kind: 'colour', assetId: CLOSE_UP })).rejects.toThrow();
    expect(drawTwinFromSelfie).not.toHaveBeenCalled();
  });
});

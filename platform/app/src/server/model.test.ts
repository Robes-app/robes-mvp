import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const repos = {
  model: { get: vi.fn() },
  avatarCells: {
    claim: vi.fn(async () => true),
    setJob: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  },
  capacity: { isExhausted: vi.fn(async () => false) },
};
vi.mock('./db', () => ({ repos }));
vi.mock('./flags', () => ({ isFlagEnabled: vi.fn(async () => true) }));
vi.mock('./media', () => ({ mediaDelivery: { url: async (k: string) => k } }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('./jobs', () => ({
  startJob: vi.fn(),
  createAndEnqueueJob: vi.fn(async () => ({ jobId: 'cell-job', status: 'queued' })),
}));

const { ensureGenericCells } = await import('./model');
const { createAndEnqueueJob, startJob } = await import('./jobs');
const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');

beforeEach(() => vi.clearAllMocks());

describe('the generic models', () => {
  it('draws the three generic portraits for her catalog, off her quota and her request', async () => {
    repos.model.get.mockResolvedValue({ filedCellId: null, genderIdentity: 'man' });
    await ensureGenericCells(USER);
    expect(repos.avatarCells.claim.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      'm-s4-h1-nt@v2',
      'm-s1-h0-nt@v2',
      'm-s7-h3-nt@v2',
    ]);
    expect(createAndEnqueueJob).toHaveBeenCalledWith(USER, {
      kind: 'avatar_cell',
      input: { cellKey: 'm-s4-h1-nt@v2' },
    });
    expect(startJob).not.toHaveBeenCalled();
  });

  it('stands down for an account with her own model, and for a cell already claimed', async () => {
    repos.model.get.mockResolvedValue({ filedCellId: 'w-s3-h1-hg', genderIdentity: 'woman' });
    await ensureGenericCells(USER);
    expect(repos.avatarCells.claim).not.toHaveBeenCalled();
    repos.model.get.mockResolvedValue({ filedCellId: null, genderIdentity: 'woman' });
    repos.avatarCells.claim.mockResolvedValue(false);
    await ensureGenericCells(USER);
    expect(createAndEnqueueJob).not.toHaveBeenCalled();
  });
});

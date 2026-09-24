import { verifiedUserId } from '@robes/db';
import { describe, expect, it, type Mock, vi } from 'vitest';
import { processAccountDeletions } from './deletion';

const A = verifiedUserId('11111111-1111-4111-8111-111111111111');
const B = verifiedUserId('22222222-2222-4222-8222-222222222222');
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

type DeletePrefix = Mock<(prefix: string) => Promise<number>>;

function deps(queue: string[], deletePrefix: DeletePrefix = vi.fn(async (_prefix: string) => 2)) {
  const deletions = {
    claimNext: vi.fn(async () => queue.shift() as never),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  return { deletions, storage: { deletePrefix }, logger };
}

describe('processAccountDeletions', () => {
  it('deletes her files under every prefix, then her account', async () => {
    const d = deps([A]);
    expect(await processAccountDeletions(d as never)).toBe(1);
    expect(d.storage.deletePrefix.mock.calls.map(([p]) => p)).toEqual([
      `uploads/${A}/`,
      `media/${A}/`,
      `generated/${A}/`,
    ]);
    expect(d.deletions.complete).toHaveBeenCalledWith(A, { objects: 6 });
  });

  it('keeps the account when files fail, and carries on with the next request', async () => {
    const deletePrefix = vi
      .fn<(prefix: string) => Promise<number>>()
      .mockRejectedValueOnce(new Error('s3 down'))
      .mockResolvedValue(0);
    const d = deps([A, B], deletePrefix);
    expect(await processAccountDeletions(d as never)).toBe(1);
    expect(d.deletions.fail).toHaveBeenCalledWith(A, 's3 down');
    expect(d.deletions.complete).toHaveBeenCalledTimes(1);
    expect(d.deletions.complete).toHaveBeenCalledWith(B, { objects: 0 });
  });

  it('stops at the limit', async () => {
    const d = deps([A, B]);
    expect(await processAccountDeletions(d as never, 1)).toBe(1);
  });
});

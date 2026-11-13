import { mediaKeys } from '@robes/media';
import { describe, expect, it, vi } from 'vitest';
import {
  STALE_UPLOAD_HOURS,
  STALE_UPLOAD_WITHIN_DAYS,
  STALE_UPLOADS_PAGE,
  sweepStaleUploads,
} from './stale-uploads';

const OPTS = { olderThanHours: STALE_UPLOAD_HOURS, withinDays: STALE_UPLOAD_WITHIN_DAYS };

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const asset = (n: number, userId = A) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  userId,
});
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

type Remove = (userId: string, assetId: string) => Promise<unknown>;

function deps(
  pages: { id: string; userId: string }[][],
  outcome = 'discarded',
  removedPages: { id: string; userId: string }[][] = [],
) {
  const due = vi.fn(async (_opts: Record<string, unknown>) => pages.shift() ?? []);
  const dueRemoved = vi.fn(async (_opts: Record<string, unknown>) => removedPages.shift() ?? []);
  const discardRemoved = vi.fn(async (userId: string, assetId: string, removeFiles: Remove) => {
    if (outcome === 'discarded') await removeFiles(userId, assetId);
    return outcome;
  });
  const discard = vi.fn(
    async (userId: string, assetId: string, _opts: unknown, removeFiles: Remove) => {
      if (outcome === 'discarded') await removeFiles(userId, assetId);
      return outcome;
    },
  );
  const storage = {
    deleteObject: vi.fn(async (_key: string) => {}),
    deletePrefix: vi.fn(async (_prefix: string) => 3),
  };
  const purgeTwinArchives = vi.fn(async () => 0);
  return {
    uploads: { due, discard, dueRemoved, discardRemoved, purgeTwinArchives },
    storage,
    logger: logger(),
  };
}

describe('sweepStaleUploads', () => {
  it('deletes each unheld look photo with its files, as its owner, and logs counts only', async () => {
    const one = asset(1);
    const two = asset(2, B);
    const d = deps([[one, two]]);
    expect(await sweepStaleUploads(d as never)).toEqual({ deleted: 2, kept: 0, failed: 0 });
    expect(d.uploads.due).toHaveBeenCalledWith({
      ...OPTS,
      limit: STALE_UPLOADS_PAGE,
      afterId: undefined,
    });
    expect(d.uploads.discard.mock.calls.map(([u, id, opts]) => [u, id, opts])).toEqual([
      [A, one.id, OPTS],
      [B, two.id, OPTS],
    ]);
    expect(d.storage.deleteObject).toHaveBeenCalledWith(mediaKeys.original(B, two.id));
    expect(d.storage.deletePrefix).toHaveBeenCalledWith(mediaKeys.assetMediaPrefix(B, two.id));
    expect(d.logger.info).toHaveBeenCalledWith(
      { deleted: 2, kept: 0, failed: 0 },
      'stale_uploads_swept',
    );
  });

  it('keeps one that was attached since it was found', async () => {
    const d = deps([[asset(1)]], 'held');
    expect(await sweepStaleUploads(d as never)).toEqual({ deleted: 0, kept: 1, failed: 0 });
    expect(d.storage.deleteObject).not.toHaveBeenCalled();
    expect(d.logger.info).not.toHaveBeenCalled();
  });

  it('pages by the last id and stops at a short page', async () => {
    const full = Array.from({ length: STALE_UPLOADS_PAGE }, (_, i) => asset(i + 1));
    const d = deps([full, [asset(STALE_UPLOADS_PAGE + 1)]]);
    expect((await sweepStaleUploads(d as never)).deleted).toBe(STALE_UPLOADS_PAGE + 1);
    expect(d.uploads.due).toHaveBeenCalledTimes(2);
    expect(d.uploads.due.mock.calls[1]?.[0]).toMatchObject({ afterId: full.at(-1)?.id });
  });

  it('carries on past a failure and counts it without naming the asset', async () => {
    const d = deps([[asset(1), asset(2)]]);
    d.uploads.discard.mockRejectedValueOnce(new Error('SlowDown'));
    expect(await sweepStaleUploads(d as never)).toEqual({ deleted: 1, kept: 0, failed: 1 });
    expect(d.logger.warn).toHaveBeenCalledWith({ reason: 'SlowDown' }, 'stale_upload_failed');
  });

  it('deletes the photos and twins she deleted with her twin, whatever their age', async () => {
    const photo = asset(7);
    const d = deps([], 'discarded', [[photo]]);
    expect(await sweepStaleUploads(d as never)).toEqual({ deleted: 1, kept: 0, failed: 0 });
    expect(d.uploads.dueRemoved).toHaveBeenCalledWith({
      limit: STALE_UPLOADS_PAGE,
      afterId: undefined,
    });
    expect(d.uploads.discardRemoved).toHaveBeenCalledWith(A, photo.id, expect.any(Function));
    expect(d.storage.deleteObject).toHaveBeenCalledWith(mediaKeys.original(A, photo.id));
    expect(d.storage.deletePrefix).toHaveBeenCalledWith(mediaKeys.assetMediaPrefix(A, photo.id));
  });

  it('stops at maxPages', async () => {
    const page = () => Array.from({ length: STALE_UPLOADS_PAGE }, (_, i) => asset(i + 1));
    const d = { ...deps([page(), page(), page()]), maxPages: 2 };
    await sweepStaleUploads(d as never);
    expect(d.uploads.due).toHaveBeenCalledTimes(2);
  });
});

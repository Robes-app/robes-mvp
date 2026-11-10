import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { queueReceiptPhotos } from './photos';

const NIALL = verifiedUserId('11111111-1111-4111-8111-111111111111');
const BEA = verifiedUserId('22222222-2222-4222-8222-222222222222');

describe('queueReceiptPhotos (hourly receipt-photos)', () => {
  it('asks the fetcher for every waiting receipt’s photos, and a failed one waits an hour', async () => {
    const intake = {
      awaitingPhotos: vi.fn(async () => [
        { userId: NIALL, inboxId: 'inbox-1' },
        { userId: BEA, inboxId: 'inbox-2' },
        { userId: NIALL, inboxId: 'inbox-3' },
      ]),
      queuePhotoReads: vi.fn(async (_userId: string, inboxId: string) => {
        if (inboxId === 'inbox-2') throw new Error('db busy');
        return [{ jobId: `job-${inboxId}`, url: `https://static.shop.test/${inboxId}.jpg` }];
      }),
    };
    const requestPhoto = vi.fn(async () => {});
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    expect(await queueReceiptPhotos({ intake, requestPhoto, logger })).toBe(2);
    expect(requestPhoto).toHaveBeenCalledWith({
      jobId: 'job-inbox-3',
      url: 'https://static.shop.test/inbox-3.jpg',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      { inboxId: 'inbox-2', reason: 'db busy' },
      'receipt_photos_failed',
    );
  });
});

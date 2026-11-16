import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createLinkImportHandler } from './link-import';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const JOB = '44444444-4444-4444-8444-444444444444';
const product = {
  label: 'Wool coat',
  brand: 'Toteme',
  price: 650,
  currency: 'EUR',
  imageUrl: 'https://shop.example/coat.jpg',
  sourceUrl: 'https://shop.example/coat',
  retailer: 'Shop',
  title: 'Wool coat | Shop',
  category: 'Coats',
  color: 'Camel',
  options: 'M / Wool',
  description: '100% wool',
};

const INBOX = '55555555-5555-4555-8555-555555555555';
const ASSET = '66666666-6666-4666-8666-666666666666';

function run(
  input: Record<string, unknown>,
  deps: {
    fetchLink?: () => Promise<never> | Promise<object>;
    requestPhoto?: (photo: { jobId: string; url: string; key: string }) => Promise<void>;
    logger?: { warn: (obj: object, msg: string) => void };
  } = {},
) {
  const intake = {
    fromLink: vi.fn(async () => INBOX),
    queuePhotoReads: vi.fn(async () => [
      { jobId: '77777777-7777-4777-8777-777777777777', url: product.imageUrl, assetId: ASSET },
    ]),
  };
  const writeStage = vi.fn(async () => {});
  const handler = createLinkImportHandler({ intake, ...(deps as object) } as never);
  const promise = handler.run({
    jobId: JOB,
    userId: USER,
    input,
    signal: new AbortController().signal,
    writeStage,
    isCancelled: async () => false,
  });
  return { promise, intake, writeStage };
}

describe('link_import handler', () => {
  it('holds the fetched product in her inbox', async () => {
    const { promise, intake, writeStage } = run({
      url: 'https://shop.example/coat',
      as: 'wishlist',
      fetched: { ok: true, product },
    });
    await expect(promise).resolves.toEqual({ status: 'succeeded' });
    expect(intake.fromLink).toHaveBeenCalledWith(USER, {
      jobId: JOB,
      retailer: 'Shop',
      subject: 'Wool coat | Shop',
      item: expect.objectContaining({
        label: 'Wool coat',
        sourceUrl: 'https://shop.example/coat',
        // The shop's words ride along as the photo read's hints.
        page: { category: 'Coats', options: 'M / Wool', color: 'Camel', description: '100% wool' },
      }),
    });
    expect(writeStage).toHaveBeenCalledWith(
      'text',
      expect.objectContaining({ suggested: 'wishlist' }),
    );
  });

  it('fails with the fetcher’s refusal code and never files anything', async () => {
    const { promise, intake } = run({
      url: 'https://shop.example/',
      as: 'wardrobe',
      fetched: { ok: false, reason: 'private_address' },
    });
    await expect(promise).rejects.toEqual(new JobError('fetch_private_address'));
    expect(intake.fromLink).not.toHaveBeenCalled();
  });

  it('fetches in-process only when given a fetcher (dev), else waits for the isolated one', async () => {
    const dev = run(
      { url: 'https://shop.example/', as: 'wardrobe' },
      {
        fetchLink: async () => ({ ok: true, product }),
      },
    );
    await expect(dev.promise).resolves.toEqual({ status: 'succeeded' });
    const aws = run({ url: 'https://shop.example/', as: 'wardrobe' });
    await expect(aws.promise).rejects.toEqual(new JobError('fetch_unavailable'));
  });

  it('refuses malformed input, including a forged fetched result', async () => {
    const { promise } = run({
      url: 'https://shop.example/',
      as: 'wardrobe',
      fetched: { ok: true },
    });
    await expect(promise).rejects.toEqual(new JobError('invalid_input'));
  });

  it('asks the isolated fetcher for the product photo, into her pending asset', async () => {
    const requestPhoto = vi.fn(async () => {});
    const { promise, intake } = run(
      { url: 'https://shop.example/coat', as: 'wardrobe', fetched: { ok: true, product } },
      { requestPhoto },
    );
    await expect(promise).resolves.toEqual({ status: 'succeeded' });
    expect(intake.queuePhotoReads).toHaveBeenCalledWith(USER, INBOX);
    expect(requestPhoto).toHaveBeenCalledWith({
      jobId: '77777777-7777-4777-8777-777777777777',
      url: 'https://shop.example/coat.jpg',
      key: `uploads/${USER}/${ASSET}/original`,
    });
  });

  it('holds the piece when its photo can’t be asked for, and asks nothing without one', async () => {
    const logger = { warn: vi.fn() };
    const failing = run(
      { url: 'https://shop.example/coat', as: 'wardrobe', fetched: { ok: true, product } },
      { requestPhoto: vi.fn(async () => Promise.reject(new Error('sqs'))), logger },
    );
    await expect(failing.promise).resolves.toEqual({ status: 'succeeded' });
    expect(logger.warn).toHaveBeenCalledWith({ reason: 'sqs' }, 'link_photo_failed');

    const bare = run(
      {
        url: 'https://shop.example/coat',
        as: 'wardrobe',
        fetched: { ok: true, product: { ...product, imageUrl: null } },
      },
      { requestPhoto: vi.fn(async () => {}) },
    );
    await expect(bare.promise).resolves.toEqual({ status: 'succeeded' });
    expect(bare.intake.queuePhotoReads).not.toHaveBeenCalled();
  });
});

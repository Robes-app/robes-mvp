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
};

function run(
  input: Record<string, unknown>,
  deps: { fetchLink?: () => Promise<never> | Promise<object> } = {},
) {
  const intake = { fromLink: vi.fn(async () => '55555555-5555-4555-8555-555555555555') };
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
      item: expect.objectContaining({ label: 'Wool coat', sourceUrl: 'https://shop.example/coat' }),
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
});

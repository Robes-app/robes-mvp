import { AiError, createFakeProvider } from '@robes/ai';
import { fakeOutput } from '@robes/ai/prompts/receipt-photo';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createReceiptReadHandler } from './receipt-read';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const OTHER = '55555555-5555-4555-8555-555555555555';
const INBOX = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';

function setup(
  opts: {
    photo?: { stored: boolean; reason?: string } | null;
    asset?: { userId: string; status: string } | null;
    output?: object;
    aiError?: AiError;
  } = {},
) {
  const intake = {
    line: vi.fn(async () => ({
      retailer: 'Zara',
      item: { label: 'REF 02335709800', brand: 'Zara', size: '6/7 years (122 cm)' },
    })),
    applyPhotoRead: vi.fn(async () => true),
  };
  const assets = {
    get: vi.fn(async () =>
      opts.asset === null
        ? undefined
        : {
            id: ASSET,
            kind: 'receipt',
            contentType: null,
            bucketKey: null,
            crop: null,
            ...(opts.asset ?? { userId: USER, status: 'ready' }),
          },
    ),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1, 2, 3])),
    head: vi.fn(async () => null),
  };
  const ai = opts.aiError
    ? {
        name: 'fake' as const,
        generateJson: vi.fn(async () => {
          throw opts.aiError;
        }),
        generateImage: vi.fn(),
      }
    : createFakeProvider({
        'inbox.receipt_photo': () => ({ ...fakeOutput(), ...opts.output }),
      });
  const generate = vi.spyOn(ai, 'generateJson');
  const handler = createReceiptReadHandler({
    ai: ai as never,
    storage,
    intake,
    assets: assets as never,
    ledger,
    assetWaitMs: 30,
    pollMs: 5,
  });
  const writeStage = vi.fn(async () => {});
  const photo = opts.photo === undefined ? { stored: true } : opts.photo;
  const run = () =>
    handler.run({
      jobId: '44444444-4444-4444-8444-444444444444',
      userId: USER,
      input: { inboxId: INBOX, index: 2, assetId: ASSET, ...(photo ? { photo } : {}) },
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, intake, ledger, storage, generate, writeStage };
}

describe('receipt_read handler', () => {
  it('names the line from its photo: the photo decides the piece, the receipt keeps the rest', async () => {
    const { run, intake, ledger, storage, generate } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
    // What the email printed rides along, fenced, as context for the photo.
    expect(generate.mock.calls[0]?.[0]).toMatchObject({
      capability: 'vision.analyse',
      user: expect.stringContaining('REF 02335709800'),
    });
    expect(intake.applyPhotoRead).toHaveBeenCalledWith(USER, INBOX, 2, {
      label: 'Pink velour tracksuit top',
      categoryL2: 'Sweatshirts & hoodies',
      categoryL3: null,
      color: 'Blush',
    });
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'inbox.receipt_photo', status: 'ok', userId: USER }),
    );
  });

  it('keeps the line as printed when the fetcher refused the photo, with no model call', async () => {
    const { run, intake, ledger, writeStage } = setup({
      photo: { stored: false, reason: 'status_403' },
    });
    await expect(run()).resolves.toEqual({ status: 'partial' });
    expect(intake.applyPhotoRead).toHaveBeenCalledWith(USER, INBOX, 2, null);
    expect(ledger.record).not.toHaveBeenCalled();
    expect(writeStage).toHaveBeenCalledWith('text', {
      inboxId: INBOX,
      index: 2,
      photo: 'status_403',
    });
  });

  it('never reads another person’s asset, nor one the renderer rejected', async () => {
    for (const asset of [
      { userId: OTHER, status: 'ready' },
      { userId: USER, status: 'failed' },
    ]) {
      const { run, intake, storage } = setup({ asset });
      await expect(run()).resolves.toEqual({ status: 'partial' });
      expect(intake.applyPhotoRead).toHaveBeenCalledWith(USER, INBOX, 2, null);
      expect(storage.getObject).not.toHaveBeenCalled();
    }
  });

  it('drops a photo that shows no piece (a banner, a logo)', async () => {
    const { run, intake } = setup({ output: { no_item_detected: true } });
    await expect(run()).resolves.toEqual({ status: 'partial' });
    expect(intake.applyPhotoRead).toHaveBeenCalledWith(USER, INBOX, 2, null);
  });

  it('records a failed model call and keeps the line as printed', async () => {
    const usage = { model: 'gemini-2.5-flash', inputTokens: 10, outputTokens: 0 } as never;
    const { run, intake, ledger } = setup({ aiError: new AiError('invalid_output', usage) });
    await expect(run()).resolves.toEqual({ status: 'partial' });
    expect(intake.applyPhotoRead).toHaveBeenCalledWith(USER, INBOX, 2, null);
    expect(ledger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('refuses malformed input', async () => {
    const handler = createReceiptReadHandler({} as never);
    await expect(
      handler.run({
        jobId: '44444444-4444-4444-8444-444444444444',
        userId: USER,
        input: { inboxId: 'nope' },
        signal: new AbortController().signal,
        writeStage: vi.fn(),
        isCancelled: async () => false,
      }),
    ).rejects.toBeInstanceOf(JobError);
  });
});

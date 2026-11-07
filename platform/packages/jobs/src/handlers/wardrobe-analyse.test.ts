import { AiError, createFakeProvider } from '@robes/ai';
import { fakeOutput } from '@robes/ai/prompts/wardrobe-analyse';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createWardrobeAnalyseHandler } from './wardrobe-analyse';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const PIECE = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';

function setup(
  opts: {
    assetStatus?: string[];
    master?: boolean | 'forbidden';
    output?: object;
    aiError?: AiError;
  } = {},
) {
  const statuses = [...(opts.assetStatus ?? ['ready'])];
  const pieces = {
    forAnalysis: vi.fn(async () => ({
      id: PIECE,
      status: 'reading',
      label: '',
      imageAssetId: ASSET,
      assetStatus: statuses.length > 1 ? statuses.shift() : statuses[0],
    })),
    apply: vi.fn(async () => {}),
    discard: vi.fn(async () => true),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1, 2, 3])),
    // The master lands before the renditions; by default it isn't there until `ready`.
    head: vi.fn(async () => {
      // The worker has no s3:ListBucket, so S3 answers a missing key with 403, not 404.
      if (opts.master === 'forbidden')
        throw Object.assign(new Error('Forbidden'), { $metadata: { httpStatusCode: 403 } });
      return opts.master ? { bytes: 3, contentType: 'image/jpeg' } : null;
    }),
  };
  const ai = opts.aiError
    ? {
        name: 'fake' as const,
        generateJson: vi.fn(async () => {
          throw opts.aiError;
        }),
        generateImage: vi.fn(),
      }
    : createFakeProvider({ 'wardrobe.analyse': () => ({ ...fakeOutput(), ...opts.output }) });
  const handler = createWardrobeAnalyseHandler({
    ai: ai as never,
    storage,
    pieces: pieces as never,
    ledger,
    assetWaitMs: 50,
    pollMs: 5,
  });
  const writeStage = vi.fn(async () => {});
  const run = () =>
    handler.run({
      jobId: '44444444-4444-4444-8444-444444444444',
      userId: USER,
      input: { pieceId: PIECE },
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, pieces, ledger, storage, writeStage };
}

describe('wardrobe_analyse handler', () => {
  it('reads the master image, files the piece and records the call', async () => {
    const { run, pieces, ledger, storage, writeStage } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
    expect(pieces.apply).toHaveBeenCalledWith(
      USER,
      PIECE,
      expect.objectContaining({
        label: 'Camel wool coat',
        categoryL2: 'Coats',
        category: 'Outerwear',
        color: 'Camel',
        colourShade: 'camel',
        colourExtra: [],
        print: null,
        material: 'wool',
      }),
    );
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'wardrobe.analyse', status: 'ok' }),
    );
    expect(writeStage).toHaveBeenCalledWith('text', expect.objectContaining({ pieceId: PIECE }));
  });

  it("files the material read from the label, and Robes' doubt about it", async () => {
    const { run, pieces } = setup({ output: { material: 'polyamide', material_check: true } });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.apply).toHaveBeenCalledWith(
      USER,
      PIECE,
      expect.objectContaining({
        material: 'polyamide',
        itemDna: expect.objectContaining({ material_check: true, prompt_version: 5 }),
      }),
    );
  });

  it("files a brand read from the design with Robes' check on it", async () => {
    const { run, pieces } = setup({ output: { brand: 'Barbour', brand_check: true } });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.apply).toHaveBeenCalledWith(
      USER,
      PIECE,
      expect.objectContaining({
        brand: 'Barbour',
        itemDna: expect.objectContaining({ brand_check: true }),
      }),
    );
  });

  it('files no material when the read leaves it out', async () => {
    const { run, pieces } = setup({ output: { material: undefined } });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.apply).toHaveBeenCalledWith(
      USER,
      PIECE,
      expect.objectContaining({ material: null }),
    );
  });

  it('waits for renditions that are still processing', async () => {
    const { run, pieces } = setup({ assetStatus: ['pending', 'pending', 'ready'] });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.forAnalysis).toHaveBeenCalledTimes(3);
  });

  it('reads as soon as the master is stored, without waiting for the renditions', async () => {
    const { run, pieces, storage } = setup({ assetStatus: ['pending'], master: true });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.forAnalysis).toHaveBeenCalledTimes(1);
    expect(storage.head).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
  });

  it('never reads a photo whose render failed, even with a master stored', async () => {
    const { run, pieces } = setup({ assetStatus: ['failed'], master: true });
    await expect(run()).rejects.toMatchObject({ code: 'unreadable_photo' });
    expect(pieces.discard).toHaveBeenCalledWith(USER, PIECE);
  });

  // Staging, 7 Nov: every read failed while the photo rendered, on the 403 for a missing master.
  it('waits for `ready` when the master check is refused, and never fails on it', async () => {
    const { run, pieces } = setup({
      assetStatus: ['pending', 'pending', 'ready'],
      master: 'forbidden',
    });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(pieces.forAnalysis).toHaveBeenCalledTimes(3);
    expect(pieces.discard).not.toHaveBeenCalled();
  });

  it('gives up cleanly when the upload never becomes ready', async () => {
    const { run, pieces } = setup({ assetStatus: ['pending'] });
    await expect(run()).rejects.toMatchObject({ code: 'asset_not_ready' });
    expect(pieces.discard).toHaveBeenCalledWith(USER, PIECE);
  });

  it('files nothing for a photo with no piece: the placeholder goes, and the job ends partial', async () => {
    const { run, pieces, writeStage } = setup({ output: { no_item_detected: true } });
    await expect(run()).resolves.toEqual({ status: 'partial' });
    expect(pieces.discard).toHaveBeenCalledWith(USER, PIECE);
    expect(pieces.apply).not.toHaveBeenCalled();
    expect(writeStage).toHaveBeenCalledWith('text', { pieceId: PIECE, noItemDetected: true });
  });

  it('maps provider failures to short codes and keeps the ledger honest', async () => {
    const usage = {
      model: 'm',
      family: 'f',
      tokensIn: 10,
      tokensOut: 0,
      images: 0,
      costMicros: 5,
      latencyMs: 1,
    };
    const { run, ledger, pieces } = setup({ aiError: new AiError('invalid_output', usage) });
    const err = await run().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(JobError);
    expect((err as JobError).code).toBe('ai_invalid_output');
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', costMicros: 5 }),
    );
    expect(pieces.discard).toHaveBeenCalledWith(USER, PIECE);
    expect(pieces.apply).not.toHaveBeenCalled();
  });

  it('keeps the placeholder while a cancelled read may be retried', async () => {
    const { run, pieces } = setup({ aiError: new AiError('cancelled') });
    await expect(run()).rejects.toBeInstanceOf(AiError);
    expect(pieces.discard).not.toHaveBeenCalled();
  });
});

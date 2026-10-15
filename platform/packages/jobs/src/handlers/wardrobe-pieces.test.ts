import { AiError, createFakeProvider } from '@robes/ai';
import { closetCategoriesIn, fakeOutput } from '@robes/ai/prompts/wardrobe-pieces';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createWardrobePiecesHandler } from './wardrobe-pieces';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const ASSET = '33333333-3333-4333-8333-333333333333';
const SHOES = '55555555-5555-4555-8555-555555555555';

function setup(
  opts: { status?: string[]; closet?: boolean; output?: object; aiError?: AiError } = {},
) {
  const statuses = [...(opts.status ?? ['ready'])];
  let crops = 0;
  const reads = {
    source: vi.fn(async () => ({
      id: ASSET,
      kind: 'wardrobe',
      status: (statuses.length > 1 ? statuses.shift() : statuses[0]) ?? 'ready',
    })),
    closet: vi.fn(async () =>
      opts.closet
        ? [
            {
              id: '66666666-6666-4666-8666-666666666666',
              label: 'Cream silk shirt',
              category: 'Tops',
              color: 'Cream',
              brand: 'Studio',
            },
            {
              id: SHOES,
              label: 'White running shoes',
              category: 'Shoes',
              color: 'White',
              brand: null,
            },
          ]
        : [],
    ),
    createCrop: vi.fn(async () => {
      crops += 1;
      return `7777777${crops}-7777-4777-8777-777777777777`;
    }),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1, 2, 3])),
    copyObject: vi.fn(async () => {}),
  };
  const onGenerated = vi.fn(async () => {});
  const ai = opts.aiError
    ? {
        name: 'fake' as const,
        generateJson: vi.fn(async () => {
          throw opts.aiError;
        }),
        generateImage: vi.fn(),
      }
    : createFakeProvider({
        'wardrobe.pieces': (req) => ({
          ...fakeOutput(closetCategoriesIn(req.user)),
          ...opts.output,
        }),
      });
  const handler = createWardrobePiecesHandler({
    ai: ai as never,
    storage,
    reads: reads as never,
    ledger,
    onGenerated,
    assetWaitMs: 50,
    pollMs: 5,
  });
  const writeStage = vi.fn(async (_stage: string, _out: Record<string, unknown>) => {});
  const run = (input: Record<string, unknown> = { assetId: ASSET }) =>
    handler.run({
      jobId: '44444444-4444-4444-8444-444444444444',
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, reads, ledger, storage, writeStage, onGenerated };
}

describe('wardrobe_pieces handler', () => {
  it('reads every piece, cuts a crop of each and writes the read on the job', async () => {
    const { run, reads, storage, writeStage, onGenerated, ledger } = setup({ closet: true });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
    expect(reads.createCrop).toHaveBeenCalledTimes(3);
    expect(reads.createCrop).toHaveBeenCalledWith(USER, ASSET, {
      x: 0.35,
      y: 0.85,
      w: 0.3,
      h: 0.12,
    });
    expect(storage.copyObject).toHaveBeenCalledWith(
      `media/${USER}/${ASSET}/master.jpg`,
      `uploads/${USER}/77777771-7777-4777-8777-777777777777/original`,
    );
    expect(onGenerated).toHaveBeenCalledTimes(3);
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'wardrobe.pieces', status: 'ok' }),
    );
    const out = writeStage.mock.calls[0]?.[1] as {
      assetId: string;
      readPieces: Array<{ label: string; match: unknown; cropAssetId: string; itemDna: object }>;
    };
    expect(out.assetId).toBe(ASSET);
    expect(out.readPieces.map((p) => p.label)).toEqual([
      'Cream long-sleeve t-shirt',
      'Black leggings',
      'White running shoes',
    ]);
    expect(out.readPieces[2]?.match).toEqual({ pieceId: SHOES, confidence: 0.8 });
    expect(out.readPieces[0]?.match).toBeNull();
    expect(out.readPieces[0]?.itemDna).toBeDefined();
  });

  it('waits for the photo’s renditions, then fails cleanly on an unreadable one', async () => {
    const waited = setup({ status: ['pending', 'ready'] });
    await expect(waited.run()).resolves.toEqual({ status: 'succeeded' });
    expect(waited.reads.source).toHaveBeenCalledTimes(2);
    await expect(setup({ status: ['failed'] }).run()).rejects.toEqual(
      new JobError('unreadable_photo'),
    );
    await expect(setup().run({ assetId: 'nope' })).rejects.toEqual(new JobError('invalid_input'));
  });

  it('keeps the photo and cuts nothing when no piece is seen', async () => {
    const { run, reads, writeStage } = setup({ output: { no_item_detected: true, pieces: [] } });
    await expect(run()).resolves.toEqual({ status: 'partial' });
    expect(reads.createCrop).not.toHaveBeenCalled();
    expect(writeStage).toHaveBeenCalledWith('text', {
      assetId: ASSET,
      noItemDetected: true,
      readPieces: [],
    });
  });

  it('turns a model failure into a short code and records its usage', async () => {
    const usage = {
      model: 'm',
      family: 'f',
      tokensIn: 1,
      tokensOut: 0,
      images: 0,
      costMicros: 1,
      latencyMs: 1,
    };
    const { run, ledger } = setup({ aiError: new AiError('invalid_output', usage) });
    await expect(run()).rejects.toEqual(new JobError('ai_invalid_output'));
    expect(ledger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });
});

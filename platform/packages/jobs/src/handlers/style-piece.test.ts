import { AiError, createFakeProvider } from '@robes/ai';
import { fakeOutput } from '@robes/ai/prompts/style-piece';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createStylePieceHandler } from './style-piece';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const PIECE = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';

function setup(ai = createFakeProvider({ 'looks.style_piece': () => fakeOutput('Camel coat') })) {
  let n = 0;
  const styling = {
    context: vi.fn(async () => ({
      firstName: 'Niall',
      gender: 'woman' as const,
      styleIcons: [],
      closet: [],
      styleDna: {},
      wardrobeCount: 0,
    })),
    anchorPiece: vi.fn(async () => ({ id: PIECE, label: 'Camel coat', imageAssetId: ASSET })),
    createGeneratedAsset: vi.fn(async () => `44444444-4444-4444-8444-44444444444${n++}`),
    trackImage: vi.fn(async () => {}),
    createIdea: vi.fn(async () => '55555555-5555-4555-8555-555555555555'),
    mergeIdeaData: vi.fn(async () => {}),
  };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1])),
    putObject: vi.fn(async () => {}),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const onGenerated = vi.fn(async () => {});
  const handler = createStylePieceHandler({
    ai,
    storage,
    styling: styling as never,
    ledger,
    onGenerated,
  });
  const writeStage = vi.fn(async () => {});
  const run = (input: Record<string, unknown> = { anchor: { type: 'piece', pieceId: PIECE } }) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, styling, storage, ledger, onGenerated, writeStage };
}

describe('key_piece handler (style a piece)', () => {
  it('writes the looks first, then only the hero frame; the others wait until she asks', async () => {
    const { run, styling, storage, onGenerated, writeStage } = setup();
    await expect(run()).resolves.toEqual({
      status: 'succeeded',
      artifactId: '55555555-5555-4555-8555-555555555555',
    });
    const stages = (writeStage.mock.calls as unknown as Array<[string]>).map((c) => c[0]);
    expect(stages).toEqual(['text', 'images']);
    expect(styling.createIdea).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ title: 'Camel coat' }),
    );
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect((storage.putObject.mock.calls[0] as unknown[])[0]).toMatch(/^uploads\/.+\/original$/);
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(styling.mergeIdeaData).toHaveBeenCalledWith(USER, expect.any(String), {
      images: [
        expect.objectContaining({ idx: 0, status: 'ready' }),
        { idx: 1, assetId: null, status: 'deferred', jobId: null },
        { idx: 2, assetId: null, status: 'deferred', jobId: null },
      ],
    });
  });

  it('keeps the looks when the hero frame fails (UX-08)', async () => {
    const base = createFakeProvider({ 'looks.style_piece': () => fakeOutput('Camel coat') });
    const ai = {
      ...base,
      generateImage: vi.fn(async () => {
        throw new AiError('blocked');
      }),
    };
    const { run, styling } = setup(ai);
    await expect(run()).resolves.toMatchObject({ status: 'partial' });
    expect(styling.mergeIdeaData).toHaveBeenCalledWith(USER, expect.any(String), {
      images: expect.arrayContaining([expect.objectContaining({ status: 'failed' })]),
    });
  });

  it('styles a typed piece without a photo and rejects bad input', async () => {
    const { run, storage } = setup();
    await expect(run({ anchor: { type: 'text', text: 'a navy blazer' } })).resolves.toMatchObject({
      status: 'succeeded',
    });
    expect(storage.getObject).not.toHaveBeenCalled();
    await expect(run({ anchor: { type: 'text', text: 'x' } })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });
});

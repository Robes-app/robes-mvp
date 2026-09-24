import { createFakeProvider } from '@robes/ai';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createLookRenderHandler } from './look-render';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '55555555-5555-4555-8555-555555555555';
const ASSET = '33333333-3333-4333-8333-333333333333';
const NEW_ASSET = '44444444-4444-4444-8444-444444444444';

function setup(
  opts: { cellStatus?: string; renderKey?: string; pieces?: object[]; cellId?: string | null } = {},
) {
  const model = {
    look: vi.fn(async () => ({
      look: {
        id: LOOK,
        name: 'Office',
        renderKey: opts.renderKey ?? 'k1',
        renderStatus: 'pending',
      },
      pieces: opts.pieces ?? [
        {
          label: 'Camel coat',
          category: 'Outerwear',
          color: 'Camel',
          brand: null,
          imageAssetId: ASSET,
          assetStatus: 'ready',
        },
        {
          label: 'Loafers',
          category: 'Shoes',
          color: null,
          brand: null,
          imageAssetId: null,
          assetStatus: null,
        },
      ],
      cellId: opts.cellId === undefined ? 'w-s3-h1-nt' : opts.cellId,
    })),
    cell: vi.fn(async () => ({
      id: 'w-s3-h1-nt@v2',
      status: opts.cellStatus ?? 'ready',
      bucketKey: 'catalog/avatar/w-s3-h1-nt@v2.png',
      contentType: 'image/png',
    })),
    setRender: vi.fn(async () => {}),
    failRender: vi.fn(async () => {}),
  };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1])),
    putObject: vi.fn(async () => {}),
  };
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  const handler = createLookRenderHandler({
    ai,
    storage,
    styling: { createGeneratedAsset: vi.fn(async () => NEW_ASSET) } as never,
    frames: {} as never,
    model: model as never,
    ledger: { record: vi.fn(async () => {}) },
    onGenerated: vi.fn(async () => {}),
  });
  const run = () =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { target: 'look', lookId: LOOK, renderKey: 'k1' },
      signal: new AbortController().signal,
      writeStage: vi.fn(async () => {}),
      isCancelled: async () => false,
    });
  return { run, model, storage, generateImage };
}

describe('look_render on her model', () => {
  it('re-feeds her model cell first, then her piece photos, and lands the render on the look', async () => {
    const { run, model, storage, generateImage } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenNthCalledWith(1, 'catalog/avatar/w-s3-h1-nt@v2.png');
    expect(storage.getObject).toHaveBeenNthCalledWith(2, `media/${USER}/${ASSET}/master.jpg`);
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.references?.map((r) => r.mimeType)).toEqual(['image/png', 'image/jpeg']);
    expect(req?.prompt).toContain('- IMAGE 2: the Camel coat');
    expect(req?.prompt).toContain('- the Loafers');
    expect(model.setRender).toHaveBeenCalledWith(USER, LOOK, 'k1', NEW_ASSET);
  });

  it('spends nothing when the render was superseded or there is no model yet', async () => {
    const stale = setup({ renderKey: 'k2' });
    await expect(stale.run()).rejects.toEqual(new JobError('superseded'));
    expect(stale.generateImage).not.toHaveBeenCalled();
    const none = setup({ cellId: null });
    await expect(none.run()).rejects.toEqual(new JobError('not_found'));
  });

  it('fails the render (so she can ask again) when her model cell is not ready', async () => {
    const { run, model, generateImage } = setup({ cellStatus: 'pending' });
    await expect(run()).rejects.toEqual(new JobError('model_not_ready'));
    expect(model.failRender).toHaveBeenCalledWith(USER, LOOK, 'k1');
    expect(generateImage).not.toHaveBeenCalled();
  });
});

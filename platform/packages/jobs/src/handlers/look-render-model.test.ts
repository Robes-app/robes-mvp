import { createFakeProvider } from '@robes/ai';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createLookRenderHandler } from './look-render';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '55555555-5555-4555-8555-555555555555';
const ASSET = '33333333-3333-4333-8333-333333333333';
const NEW_ASSET = '44444444-4444-4444-8444-444444444444';
// The render key names the model it stands on: `{cellId}@{style}:{rack}`.
const KEY = 'w-s3-h1-nt@v2:rack1';

function setup(
  opts: {
    cellStatus?: string;
    renderKey?: string;
    asked?: string;
    pieces?: object[];
    twin?: object;
    pictureNote?: string | null;
  } = {},
) {
  const model = {
    look: vi.fn(async () => ({
      look: {
        id: LOOK,
        name: 'Office',
        renderKey: opts.renderKey ?? KEY,
        renderStatus: 'pending',
        styling: { 'piece-coat': 'worn open' },
        pictureNote: opts.pictureNote ?? null,
      },
      pieces: opts.pieces ?? [
        {
          id: 'piece-coat',
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
    })),
    cell: vi.fn(async (key: string) => ({
      id: key,
      status: opts.cellStatus ?? 'ready',
      bucketKey: `catalog/avatar/${key}.png`,
      contentType: 'image/png',
    })),
    setRender: vi.fn(async () => {}),
    failRender: vi.fn(async () => {}),
    model: vi.fn(async () => opts.twin),
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
      input: { target: 'look', lookId: LOOK, renderKey: opts.asked ?? KEY },
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
    expect(model.setRender).toHaveBeenCalledWith(USER, LOOK, KEY, NEW_ASSET);
  });

  it('spends nothing when the render was superseded or there is no model yet', async () => {
    const stale = setup({ renderKey: 'k2' });
    await expect(stale.run()).rejects.toEqual(new JobError('superseded'));
    expect(stale.generateImage).not.toHaveBeenCalled();
    // A key that names no catalog cell draws nothing.
    const none = setup({ renderKey: 'nonsense:rack1', asked: 'nonsense:rack1' });
    await expect(none.run()).rejects.toEqual(new JobError('model_not_ready'));
    expect(none.generateImage).not.toHaveBeenCalled();
  });

  it('stands a draft on the Robes model the key names while she has none of her own', async () => {
    const key = 'm-r4@v1:rack1';
    const { run, model, storage, generateImage } = setup({ renderKey: key, asked: key });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(model.cell).toHaveBeenCalledWith('m-r4@v1');
    expect(storage.getObject).toHaveBeenNthCalledWith(1, 'catalog/avatar/m-r4@v1.png');
    expect(generateImage.mock.calls[0]?.[0]?.prompt).toContain('Keep the SAME man');
  });

  it('fails the render (so she can ask again) when her model cell is not ready', async () => {
    const { run, model, generateImage } = setup({ cellStatus: 'pending' });
    await expect(run()).rejects.toEqual(new JobError('model_not_ready'));
    expect(model.failRender).toHaveBeenCalledWith(USER, LOOK, KEY);
    expect(generateImage).not.toHaveBeenCalled();
  });
});

describe('look_render on her model: how a piece is worn', () => {
  it('rides the garment line', async () => {
    const { run, generateImage } = setup();
    await run();
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('Worn: worn open.');
  });
});

// D21: her picture note, read from the look, styles the picture and never the rack.
describe('look_render on her model: her picture note', () => {
  it('rides the prompt as styling for the picture, the pieces unchanged', async () => {
    const { run, generateImage, model } = setup({ pictureNote: 'sleeves rolled up' });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    const prompt = generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(prompt).toContain('<user_input>\nsleeves rolled up\n</user_input>');
    expect(prompt).toContain('never adds, removes or substitutes a piece');
    expect(prompt).toContain('- IMAGE 2: the Camel coat');
    expect(prompt).toContain('- the Loafers');
    expect(model.setRender).toHaveBeenCalledWith(USER, LOOK, KEY, NEW_ASSET);
  });

  it('says nothing of a note when the look has none', async () => {
    const { run, generateImage } = setup();
    await run();
    expect(generateImage.mock.calls[0]?.[0].prompt).not.toContain('HER NOTE');
  });
});

describe('look_render on her twin', () => {
  const TWIN = '77777777-7777-4777-8777-777777777777';
  const FACE = '88888888-8888-4888-8888-888888888888';
  const row = {
    genderIdentity: 'woman',
    avatarPrefs: {},
    heightCm: null,
    sizeUk: 12,
    bustBand: null,
    bustCup: null,
    bustCm: null,
    waistCm: null,
    ageBand: null,
    bodyType: null,
    headshotAssetId: FACE,
    skinHex: null,
    hairHex: null,
    twinAssetId: TWIN,
  };

  it('feeds the twin, then her close-up, then her pieces, with her figure in words', async () => {
    const key = 'twin:abc:rack';
    const { run, storage, generateImage } = setup({ renderKey: key, asked: key, twin: row });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenNthCalledWith(1, `media/${USER}/${TWIN}/master.jpg`);
    expect(storage.getObject).toHaveBeenNthCalledWith(2, `media/${USER}/${FACE}/master.jpg`);
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.references).toHaveLength(3);
    expect(req?.prompt).toContain('IMAGE 2 is a close-up photograph of the same person');
    expect(req?.prompt).toContain('- IMAGE 3: the Camel coat');
    expect(req?.prompt).toContain('Her figure, as IMAGE 1 shows it: an average frame.');
  });

  it('fails the render when the twin is gone', async () => {
    const key = 'twin:abc:rack';
    const { run, model, generateImage } = setup({
      renderKey: key,
      asked: key,
      twin: { ...row, twinAssetId: null },
    });
    await expect(run()).rejects.toEqual(new JobError('model_not_ready'));
    expect(model.failRender).toHaveBeenCalled();
    expect(generateImage).not.toHaveBeenCalled();
  });
});

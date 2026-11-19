import { AiError, createFakeProvider } from '@robes/ai';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { frameAnchor, modelReference } from './look-frame';
import { createLookRenderHandler } from './look-render';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '77777777-7777-4777-8777-777777777777';
const PIECE = '22222222-2222-4222-8222-222222222222';
const PHOTO = '33333333-3333-4333-8333-333333333333';
const FRAME = '88888888-8888-4888-8888-888888888888';
const SET = '55555555-5555-4555-8555-555555555555';

function setup(
  look: Record<string, unknown> = {},
  model?: { cell: (key: string) => unknown; model?: () => unknown },
) {
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  const suggested = {
    look: vi.fn(async () => ({
      look: {
        id: LOOK,
        name: 'Garden party',
        status: 'draft',
        setId: SET,
        setIndex: 1,
        proposals: [{ key: 'p-aaaa1111', name: 'Black mules', category: 'Shoes', brand: 'Toteme' }],
        styling: { [PIECE]: 'tucked at the front' },
        frameAssetId: FRAME,
        renderKey: 'frame:k1',
        ...look,
      },
      pieces: [
        {
          id: PIECE,
          label: 'Silk shirt',
          category: 'Tops',
          color: 'ivory',
          brand: null,
          imageAssetId: PHOTO,
          assetStatus: 'ready',
        },
      ],
      siblings: [],
    })),
    setFrame: vi.fn(async () => true),
    failFrame: vi.fn(async () => {}),
  };
  const styling = {
    context: vi.fn(async () => ({ gender: 'woman', styleIcons: [] })),
    getSet: vi.fn(async () => ({
      data: {
        set: true,
        mode: 'prompt',
        anchor: { type: 'text', label: 'dinner' },
        prompt: 'dinner',
        dateHint: null,
        day: null,
        fallback: false,
        wearer: 'woman',
        ways: [
          { eyebrow: 'A', title: 'One', scene: 'x' },
          { eyebrow: 'Evening', title: 'Garden party', scene: 'A long lunch in the sun.' },
        ],
      },
    })),
    anchorPiece: vi.fn(),
    modelCellId: vi.fn(async () => null),
    createGeneratedAsset: vi.fn(async () => '44444444-4444-4444-8444-444444444444'),
  };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1])),
    putObject: vi.fn(async () => {}),
  };
  const ledger = { record: vi.fn(async (_call: object) => {}) };
  const handler = createLookRenderHandler({
    ai,
    storage,
    styling: styling as never,
    frames: {} as never,
    suggested: suggested as never,
    ...(model ? { model: model as never } : {}),
    ledger,
  });
  const run = (frameKey = 'k1') =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { target: 'frame', lookId: LOOK, frameKey },
      signal: new AbortController().signal,
      writeStage: vi.fn(async () => {}),
      isCancelled: async () => false,
    });
  return { run, generateImage, suggested, storage, ledger };
}

const CLOSE_UP = '99999999-9999-4999-8999-999999999999';
const TWIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const readyCell = (key: string) => ({
  id: key,
  status: 'ready',
  bucketKey: `catalog/avatar/${key}.png`,
  contentType: 'image/png',
});
const twinRow = (over: Record<string, unknown> = {}) => ({
  genderIdentity: 'woman',
  modelPreset: null,
  filedCellId: null,
  twinAssetId: TWIN,
  twinKey: 'k',
  avatarPrefs: {},
  heightCm: null,
  sizeUk: 12,
  bustBand: null,
  bustCup: null,
  bustCm: null,
  waistCm: null,
  ageBand: null,
  bodyType: null,
  headshotAssetId: CLOSE_UP,
  skinHex: null,
  hairHex: null,
  ...over,
});

// Testing 17 Nov: re-dressing the last picture alone drifted a Robes model ~25 years older over a
// day of edits. Every re-dress now takes the person from the model the frame first stood on.
describe('look_render: a re-dress keeps the person', () => {
  it('anchors to the recorded Robes model’s portrait, the frame kept for the setting only', async () => {
    const cell = vi.fn(async (key: string) => readyCell(key));
    const { run, generateImage, storage, suggested } = setup(
      { stoodOn: 'robes', stoodOnCell: 'w-r4' },
      { cell },
    );
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(cell).toHaveBeenCalledWith('w-r4@v2');
    expect(storage.getObject).toHaveBeenNthCalledWith(1, `media/${USER}/${FRAME}/master.jpg`);
    expect(storage.getObject).toHaveBeenNthCalledWith(2, 'catalog/avatar/w-r4@v2.png');
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.references?.map((r) => r.mimeType)).toEqual([
      'image/jpeg',
      'image/png',
      'image/jpeg',
    ]);
    expect(req?.prompt).toContain('IMAGE 2 is the reference portrait of the person');
    expect(req?.prompt).toContain('never from IMAGE 1');
    expect(req?.prompt).toContain('- IMAGE 3: the Silk shirt (ivory Tops)');
    expect(req?.prompt).not.toContain('a faithful likeness of IMAGE 1');
    // The look keeps what it stood on.
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
      undefined,
      null,
    );
  });

  it('anchors a frame on her twin to her twin, her close-up and her figure', async () => {
    const cell = vi.fn(async (key: string) => readyCell(key));
    const model = vi.fn(async () => twinRow());
    const { run, generateImage, storage } = setup({ stoodOn: 'twin' }, { cell, model });
    await run();
    expect(storage.getObject).toHaveBeenNthCalledWith(2, `media/${USER}/${TWIN}/master.jpg`);
    expect(storage.getObject).toHaveBeenNthCalledWith(3, `media/${USER}/${CLOSE_UP}/master.jpg`);
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.references).toHaveLength(4);
    expect(req?.prompt).toContain('IMAGE 3 is a close-up photograph of the same person');
    expect(req?.prompt).toContain('Her figure, as IMAGE 2 shows it: an average frame');
    expect(req?.prompt).toContain('- IMAGE 4: the Silk shirt');
  });

  it('takes the model she stands on for a frame from before the cell was recorded, and records it', async () => {
    const cell = vi.fn(async (key: string) => readyCell(key));
    const model = vi.fn(async () => twinRow({ twinAssetId: null, twinKey: null, modelPreset: 4 }));
    const { run, generateImage, suggested } = setup({ stoodOn: 'robes' }, { cell, model });
    await run();
    expect(cell).toHaveBeenCalledWith('w-r4@v2');
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('IMAGE 2 is the reference portrait');
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
      'robes',
      'w-r4',
    );
  });

  it('never anchors a legacy frame to a model of another kind, nor one drawn on no model', async () => {
    const cell = vi.fn(async (key: string) => readyCell(key));
    const model = vi.fn(async () => twinRow());
    // Drawn on a Robes model; she now stands on her twin: the frame alone, as before.
    const kind = setup({ stoodOn: 'robes' }, { cell, model });
    await kind.run();
    expect(kind.generateImage.mock.calls[0]?.[0].references).toHaveLength(2);
    expect(kind.generateImage.mock.calls[0]?.[0].prompt).toContain(
      'a faithful likeness of IMAGE 1',
    );
    const none = setup({ stoodOn: null }, { cell, model });
    await none.run();
    expect(none.generateImage.mock.calls[0]?.[0].references).toHaveLength(2);
  });

  it('draws a fresh frame on her twin with her close-up and figure, and records the cell otherwise', async () => {
    const cell = vi.fn(async (key: string) => readyCell(key));
    const twin = setup({ frameAssetId: null }, { cell, model: vi.fn(async () => twinRow()) });
    await twin.run();
    const req = twin.generateImage.mock.calls[0]?.[0];
    expect(req?.references?.slice(0, 2)).toHaveLength(2);
    expect(req?.prompt).toContain('IMAGE 2 is a close-up photograph of the same person');
    expect(req?.prompt).toContain('Her figure, as the first image shows it: an average frame');
    expect(twin.suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
      'twin',
      null,
    );
    const robes = setup({ frameAssetId: null }, { cell });
    await robes.run();
    expect(robes.suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
      'robes',
      'w-r2',
    );
  });
});

describe('look_render: Robes’ frame of a look', () => {
  it('re-dresses the frame in place, her pieces as references, how each is worn', async () => {
    const { run, generateImage, suggested, storage } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenNthCalledWith(1, `media/${USER}/${FRAME}/master.jpg`);
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.feature).toBe('avatar.frame');
    expect(req?.references).toHaveLength(2);
    expect(req?.prompt).toContain('IMAGE 1 is an existing photograph of this look');
    expect(req?.prompt).toContain('- IMAGE 2: the Silk shirt (ivory Tops)');
    expect(req?.prompt).toContain('Worn: tucked at the front.');
    expect(req?.prompt).toContain('- the Black mules (Shoes by Toteme).');
    // A re-dressed frame keeps the model its first drawing stood on.
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
      undefined,
      null,
    );
  });

  // Testing 19 Nov: "can you add a warm coat" put a coat filed as Other on the rack, worn open over
  // the top; the re-dress kept the top and left the coat out.
  it('draws a proposed coat filed as Other as the outer layer, and keeps the prompt it sent', async () => {
    const coat = {
      key: 'p-coat1111',
      name: 'Oversized wool-blend coat',
      category: 'Other',
      brand: 'COS',
    };
    const { run, generateImage, ledger } = setup({
      proposals: [coat],
      styling: { 'p-coat1111': 'worn open over the shirt' },
    });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    const prompt = generateImage.mock.calls[0]?.[0]?.prompt;
    expect(prompt).toContain(
      '- the Oversized wool-blend coat (Outerwear by COS). Worn: worn open over the shirt.\nLAYERS: the Oversized wool-blend coat is the outer layer, worn over the Silk shirt',
    );
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'avatar.frame', status: 'ok', prompt }),
    );
  });

  // D21: her picture note rides every frame, re-dressed or drawn fresh; the rack is the rack.
  it('carries her picture note into the frame, re-dressed or drawn fresh', async () => {
    const redress = setup({ pictureNote: 'sleeves rolled up' });
    await redress.run();
    const re = redress.generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(re).toContain('<user_input>\nsleeves rolled up\n</user_input>');
    expect(re).toContain('- IMAGE 2: the Silk shirt (ivory Tops)');
    expect(re).toContain('- the Black mules (Shoes by Toteme).');
    const fresh = setup({ frameAssetId: null, pictureNote: 'hair up' });
    await fresh.run();
    const fr = fresh.generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(fr).toContain('<user_input>\nhair up\n</user_input>');
    expect(fr).toContain('Look: "Garden party" — Evening.');
    const plain = setup();
    await plain.run();
    expect(plain.generateImage.mock.calls[0]?.[0].prompt).not.toContain('HER NOTE');
  });

  it('draws a suggestion’s first frame from its set when it has none', async () => {
    const { run, generateImage } = setup({ frameAssetId: null, status: 'suggested' });
    await run();
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.capability).toBe('image.secondary');
    expect(req?.prompt).toContain('Look: "Garden party" — Evening.');
    expect(req?.prompt).toContain('The scene: A long lunch in the sun.');
  });

  // Design 1b: her draft is dressed on her model in the studio, never set in a scene.
  it('draws her draft’s first frame on her model in the studio', async () => {
    const { run, generateImage } = setup({ frameAssetId: null });
    await run();
    const prompt = generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(prompt).toContain('Look: "Garden party" — Evening.');
    expect(prompt).toContain('clean warm-grey studio backdrop');
    expect(prompt).not.toContain('A long lunch in the sun');
  });

  it('stands down when the rack moved on, and gives the claim back on failure', async () => {
    const { run, generateImage, suggested } = setup();
    await expect(run('k0')).rejects.toMatchObject({ code: 'superseded' });
    expect(generateImage).not.toHaveBeenCalled();
    generateImage.mockRejectedValueOnce(new AiError('blocked'));
    await expect(run()).rejects.toMatchObject({ code: 'ai_blocked' });
    expect(suggested.failFrame).toHaveBeenCalledWith(USER, LOOK, 'k1');
  });

  it('with no model of her own, the k-th way stands on the k-th Robes model', async () => {
    const cell = vi.fn(async (key: string) =>
      key === 'w-r2@v2'
        ? {
            id: key,
            status: 'ready',
            bucketKey: 'catalog/avatar/w-r2@v2.png',
            contentType: 'image/png',
          }
        : undefined,
    );
    const { run, generateImage, storage } = setup({ frameAssetId: null }, { cell });
    await run();
    expect(cell).toHaveBeenCalledWith('w-r2@v2');
    expect(storage.getObject).toHaveBeenCalledWith('catalog/avatar/w-r2@v2.png');
    expect(generateImage.mock.calls[0]?.[0]?.references?.[0]?.mimeType).toBe('image/png');
  });

  it('shoots on no model while the Robes model is not drawn yet', async () => {
    const cell = vi.fn(async () => undefined);
    const { run, generateImage } = setup({ frameAssetId: null }, { cell });
    await run();
    expect(cell).toHaveBeenCalledWith('w-r2@v2');
    expect(generateImage.mock.calls[0]?.[0]?.references).toHaveLength(1);
  });
});

describe('modelReference', () => {
  const deps = (twinAssetId: string | null, over: Record<string, unknown> = {}) => ({
    storage: {
      getObject: vi.fn(async (key: string) => new TextEncoder().encode(key)),
      putObject: vi.fn(),
    },
    styling: { modelCellId: vi.fn(async () => 'w-s3-h1-nt'), createGeneratedAsset: vi.fn() },
    cells: {
      model: vi.fn(
        async () =>
          ({
            genderIdentity: 'woman',
            modelPreset: null,
            filedCellId: 'w-s3-h1-nt',
            twinAssetId,
            twinKey: twinAssetId ? 'k' : null,
            ...over,
          }) as never,
      ),
      cell: vi.fn(async (key: string) => ({
        id: key,
        status: 'ready',
        bucketKey: `catalog/avatar/${key}.png`,
        contentType: 'image/png',
      })),
    },
  });

  it('brings her close-up and figure beside her twin, and names the cell otherwise', async () => {
    const d = deps(FRAME, twinRow({ twinAssetId: FRAME }));
    const twin = await modelReference(d, USER);
    expect(new TextDecoder().decode(twin.face?.data)).toBe(`media/${USER}/${CLOSE_UP}/master.jpg`);
    expect(twin.figure).toContain('an average frame');
    expect(twin.cellId).toBeNull();
    const cell = await modelReference(deps(null), USER);
    expect(cell.face).toBeNull();
    expect(cell.cellId).toBe('w-s3-h1-nt');
  });

  it('anchors a re-dress to her twin as it is now, or the recorded cell, else nothing', async () => {
    const d = deps(FRAME, twinRow({ twinAssetId: FRAME }));
    expect((await frameAnchor(d, USER, { on: 'twin', cellId: null }))?.on).toBe('twin');
    const robes = await frameAnchor(d, USER, { on: 'robes', cellId: 'w-r4' });
    expect(new TextDecoder().decode(robes?.image?.data)).toBe('catalog/avatar/w-r4@v2.png');
    expect(await frameAnchor(d, USER, { on: 'robes', cellId: null })).toBeNull();
    expect(await frameAnchor(d, USER, { on: null, cellId: null })).toBeNull();
    // She deleted her twin: nothing to anchor to.
    expect(await frameAnchor(deps(null), USER, { on: 'twin', cellId: null })).toBeNull();
  });

  it('shoots on her twin first, else her catalog cell, and says which', async () => {
    const twin = await modelReference(deps(FRAME), USER);
    expect(twin.on).toBe('twin');
    expect(new TextDecoder().decode(twin.image?.data)).toBe(`media/${USER}/${FRAME}/master.jpg`);
    const cell = await modelReference(deps(null), USER);
    expect(cell.on).toBe('cell');
    expect(cell.image?.mimeType).toBe('image/png');
    expect(new TextDecoder().decode(cell.image?.data)).toBe('catalog/avatar/w-s3-h1-nt@v2.png');
  });

  it('shoots on the Robes model she chose over her twin, and every way on that one', async () => {
    const d = deps(FRAME, { modelPreset: 4 });
    const chosen = await modelReference(d, USER, { wearer: 'woman', index: 1 });
    expect(chosen.on).toBe('robes');
    expect(new TextDecoder().decode(chosen.image?.data)).toBe('catalog/avatar/w-r4@v2.png');
    // None chosen, nothing of her own: the k-th way on the k-th Robes model.
    const kth = await modelReference(deps(null, { filedCellId: null }), USER, {
      wearer: 'man',
      index: 6,
    });
    expect(kth.on).toBe('robes');
    expect(new TextDecoder().decode(kth.image?.data)).toBe('catalog/avatar/m-r2@v2.png');
  });
});

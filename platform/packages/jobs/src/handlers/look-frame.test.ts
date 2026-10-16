import { AiError, createFakeProvider } from '@robes/ai';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createLookRenderHandler } from './look-render';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '77777777-7777-4777-8777-777777777777';
const PIECE = '22222222-2222-4222-8222-222222222222';
const PHOTO = '33333333-3333-4333-8333-333333333333';
const FRAME = '88888888-8888-4888-8888-888888888888';
const SET = '55555555-5555-4555-8555-555555555555';

function setup(look: Record<string, unknown> = {}) {
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
  const handler = createLookRenderHandler({
    ai,
    storage,
    styling: styling as never,
    frames: {} as never,
    suggested: suggested as never,
    ledger: { record: vi.fn(async () => {}) },
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
  return { run, generateImage, suggested, storage };
}

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
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      'k1',
      '44444444-4444-4444-8444-444444444444',
    );
  });

  it('draws a suggestion’s first frame from its set when it has none', async () => {
    const { run, generateImage } = setup({ frameAssetId: null });
    await run();
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.capability).toBe('image.secondary');
    expect(req?.prompt).toContain('Look: "Garden party" — Evening.');
    expect(req?.prompt).toContain('The scene: A long lunch in the sun.');
  });

  it('stands down when the rack moved on, and gives the claim back on failure', async () => {
    const { run, generateImage, suggested } = setup();
    await expect(run('k0')).rejects.toMatchObject({ code: 'superseded' });
    expect(generateImage).not.toHaveBeenCalled();
    generateImage.mockRejectedValueOnce(new AiError('blocked'));
    await expect(run()).rejects.toMatchObject({ code: 'ai_blocked' });
    expect(suggested.failFrame).toHaveBeenCalledWith(USER, LOOK, 'k1');
  });
});

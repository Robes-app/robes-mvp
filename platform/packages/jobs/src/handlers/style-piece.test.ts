import { AiError, createFakeProvider } from '@robes/ai';
import { fakeOutput } from '@robes/ai/prompts/style-piece';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createStylePieceHandler, type specFromWay } from './style-piece';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const PIECE = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';
const SET = '55555555-5555-4555-8555-555555555555';
const LOOK = '77777777-7777-4777-8777-777777777777';
const JOB = '66666666-6666-4666-8666-666666666666';
const owned = {
  id: PIECE,
  label: 'Camel coat',
  category: 'Outerwear',
  color: 'Camel',
  brand: 'Max Mara',
  imageAssetId: ASSET,
  timesWorn: 1,
};
const fake = (o: Partial<Parameters<typeof fakeOutput>[0]> = {}) =>
  fakeOutput({ label: 'Camel coat', closetSize: 0, refine: false, dressMe: false, ...o });

function setup(ai = createFakeProvider({ 'looks.style_piece': () => fake() })) {
  let n = 0;
  const styling = {
    context: vi.fn(async () => ({
      firstName: 'Niall',
      gender: 'woman' as const,
      styleIcons: [],
      closet: [owned],
      styleDna: {},
      wardrobeCount: 1,
    })),
    dailyContext: vi.fn(async () => ({
      homeCity: 'Dublin',
      homeLat: 53.3,
      homeLon: -6.2,
      timezone: 'Europe/Dublin',
    })),
    anchorPiece: vi.fn(async () => ({ id: PIECE, label: 'Camel coat', imageAssetId: ASSET })),
    createGeneratedAsset: vi.fn(async () => `44444444-4444-4444-8444-44444444444${n++}`),
    trackImage: vi.fn(async () => {}),
    createSet: vi.fn(async () => SET),
    getSet: vi.fn(async () => ({
      id: SET,
      title: 'Camel coat',
      generationJobId: JOB,
      data: {
        set: true,
        mode: 'piece',
        anchor: { type: 'piece', pieceId: PIECE, label: 'Camel coat' },
        prompt: null,
        dateHint: null,
        day: null,
        fallback: false,
        wearer: 'woman',
        ways: fake().ways,
      },
    })),
    modelCellId: vi.fn(async () => null),
  };
  const suggested = {
    mintSet: vi.fn(async (_u: string, _s: string, specs: unknown[]) =>
      specs.map((_, i) => `l${i}`),
    ),
    rewrite: vi.fn(async () => true),
    setFirstFrame: vi.fn(async () => {}),
    look: vi.fn(async () => ({
      look: {
        id: LOOK,
        name: 'Garden party',
        status: 'suggested',
        setId: SET,
        setIndex: 1,
        anchorPieceId: PIECE,
        proposals: [{ key: 'p-aaaa1111', name: 'Tan loafers', category: 'Shoes' }],
        styling: null,
        frameAssetId: null,
        renderKey: null,
        dateHint: null,
      },
      pieces: [{ id: PIECE, label: 'Camel coat', category: 'Outerwear' }],
      siblings: [{ id: 'x', name: 'City dinner' }],
    })),
  };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1])),
    putObject: vi.fn(async () => {}),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const onGenerated = vi.fn(async () => {});
  const forecast = vi.fn(async () => ({
    city: 'Dublin',
    tempRange: '9–14°C',
    condition: 'light rain',
    tmax: 14,
    code: 61,
  }));
  const generateJson = vi.spyOn(ai, 'generateJson');
  const generateImage = vi.spyOn(ai, 'generateImage');
  const handler = createStylePieceHandler({
    ai,
    storage,
    styling: styling as never,
    suggested: suggested as never,
    ledger,
    onGenerated,
    forecast,
    now: () => new Date('2026-10-15T09:00:00Z'),
  });
  const writeStage = vi.fn(async () => {});
  const run = (input: Record<string, unknown> = { anchor: { type: 'piece', pieceId: PIECE } }) =>
    handler.run({
      jobId: JOB,
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return {
    run,
    styling,
    suggested,
    storage,
    ledger,
    forecast,
    writeStage,
    generateJson,
    generateImage,
  };
}

describe('key_piece handler (suggested looks)', () => {
  it('mints three suggested looks from a piece, the anchor always on the rack', async () => {
    const { run, suggested, styling, writeStage, generateImage } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded', artifactId: SET });
    expect(styling.createSet).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        title: 'Camel coat',
        data: expect.objectContaining({ set: true, mode: 'piece', promptVersion: 3 }),
      }),
    );
    const specs = suggested.mintSet.mock.calls[0]?.[2] as ReturnType<typeof specFromWay>[];
    expect(specs).toHaveLength(3);
    expect(specs[0]).toMatchObject({
      setIndex: 0,
      name: 'Quiet confidence',
      note: 'A slow morning at the gallery, sleeves pushed, unhurried.',
      anchorPieceId: PIECE,
    });
    expect(specs[0]?.pieces[0]).toEqual({ pieceId: PIECE, role: 'anchor' });
    expect(specs[0]?.proposals.map((p) => p.name)).toEqual([
      'Cream knit',
      'Camel coat',
      'Tan leather loafers',
    ]);
    expect(writeStage).toHaveBeenNthCalledWith(
      1,
      'text',
      expect.objectContaining({ setId: SET, lookIds: ['l0', 'l1', 'l2'] }),
    );
    // Only the first frame now; the anchor's photo rides it.
    expect(generateImage).toHaveBeenCalledTimes(1);
    expect(generateImage.mock.calls[0]?.[0].references).toHaveLength(1);
    expect(suggested.setFirstFrame).toHaveBeenCalledWith(
      USER,
      SET,
      0,
      '44444444-4444-4444-8444-444444444440',
    );
  });

  it('resolves her own pieces by closet number into the rack, as references for the frame', async () => {
    const out = fake({ closetSize: 1 });
    const { run, suggested, generateImage } = setup(
      createFakeProvider({ 'looks.style_piece': () => out }),
    );
    await run({ anchor: { type: 'text', text: 'a camel coat' } });
    const specs = suggested.mintSet.mock.calls[0]?.[2] as ReturnType<typeof specFromWay>[];
    expect(specs[0]?.pieces).toEqual([{ pieceId: PIECE, role: 'canvas' }]);
    expect(specs[0]?.anchorPieceId).toBeNull();
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('- IMAGE 1: the Cream knit');
  });

  it('dresses a named day: that day’s forecast, the day carried as a hint', async () => {
    const { run, generateJson, forecast, suggested, styling } = setup();
    await run({
      mode: 'prompt',
      prompt: 'Dinner on saturday night, chic and cool',
      date: '2026-10-17',
    });
    expect(forecast).toHaveBeenCalledWith({
      city: 'Dublin',
      lat: 53.3,
      lon: -6.2,
      date: '2026-10-17',
    });
    const req = generateJson.mock.calls[0]?.[0];
    expect(req?.system).toContain('She is dressing for a real day.');
    expect(req?.user).toContain(
      'She is dressing for Saturday 17 October. Forecast for that day: Dublin · October | 9–14°C | light rain.',
    );
    expect(req?.user).toContain(
      'Her brief for Saturday 17 October: <user_input>\nDinner on saturday night',
    );
    const specs = suggested.mintSet.mock.calls[0]?.[2] as ReturnType<typeof specFromWay>[];
    expect(specs.every((s) => s.dateHint === '2026-10-17' && s.anchorPieceId === null)).toBe(true);
    expect((styling.createSet.mock.calls[0] as unknown[] | undefined)?.[1]).toMatchObject({
      data: {
        mode: 'prompt',
        prompt: 'Dinner on saturday night, chic and cool',
        dateHint: '2026-10-17',
      },
    });
    // A day gone by carries nothing.
    await run({ mode: 'prompt', prompt: 'what to wear', date: '2026-10-01' });
    const later = suggested.mintSet.mock.calls[1]?.[2] as ReturnType<typeof specFromWay>[];
    expect(later[0]?.dateHint).toBeNull();
  });

  it('re-writes one suggestion on ↻, keeping the key piece and distinct from the others', async () => {
    const { run, generateJson, suggested } = setup();
    await expect(run({ mode: 'restyle', lookId: LOOK })).resolves.toEqual({ status: 'succeeded' });
    const user = generateJson.mock.calls[0]?.[0].user ?? '';
    expect(user).toContain('- Camel coat [Outerwear] — KEEP');
    expect(user).toContain('- Tan loafers [Shoes]');
    expect(user).toContain('built around the same key piece, unlike the other looks.');
    expect(user).toContain('unchanged: "City dinner".');
    expect(suggested.rewrite).toHaveBeenCalledWith(
      USER,
      LOOK,
      expect.objectContaining({ name: 'Quiet confidence', setIndex: 1 }),
    );
    expect(suggested.setFirstFrame).toHaveBeenCalledWith(USER, SET, 1, expect.any(String));
    suggested.look.mockResolvedValueOnce(undefined as never);
    await expect(run({ mode: 'restyle', lookId: LOOK })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('keeps the looks when the frame fails (UX-08), and rejects bad input', async () => {
    const ai = createFakeProvider({ 'looks.style_piece': () => fake() });
    vi.spyOn(ai, 'generateImage').mockRejectedValue(new AiError('blocked'));
    const { run, suggested } = setup(ai);
    await expect(run()).resolves.toMatchObject({ status: 'partial' });
    expect(suggested.mintSet).toHaveBeenCalled();
    expect(suggested.setFirstFrame).not.toHaveBeenCalled();
    await expect(run({ anchor: { type: 'text', text: 'x' } })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });
});

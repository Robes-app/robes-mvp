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
const WISH = '88888888-8888-4888-8888-888888888888';
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
      wishes: [{ id: WISH, label: 'Silk cami', category: 'Tops', color: 'coral', brand: 'Vince' }],
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
    recentSets: vi.fn(
      async (): Promise<unknown[]> => [
        {
          prompt: null,
          anchor: { label: 'Silk slip' },
          ways: [{ title: 'Gallery night', pieces: [{ name: 'Silk slip' }, { name: 'Mules' }] }],
        },
        'not a set',
      ],
    ),
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
    mintSet: vi.fn(
      async (_u: string, _s: string, specs: unknown[], _claim?: unknown, _opts?: unknown) =>
        specs.map((_, i) => `l${i}`),
    ),
    rewrite: vi.fn(async () => true),
    setFrame: vi.fn(async () => true),
    failFrame: vi.fn(async () => {}),
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
  const destination = vi.fn(async (q: { name: string }) =>
    q.name === 'Lisbon'
      ? { place: 'Lisbon, Portugal', tempRange: '15–21°C', condition: 'clear', seasonal: false }
      : null,
  );
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
    destination,
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
    destination,
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
        data: expect.objectContaining({ set: true, mode: 'piece', promptVersion: 8 }),
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
    // A suggestion stands in its scene.
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('The scene: ');
    // The hero's frame is claimed with the mint (before the set is exposed), then lands by key.
    const claim = suggested.mintSet.mock.calls[0]?.[3] as { frameKey: string } | undefined;
    expect(claim).toEqual({
      setIndex: 0,
      frameKey: expect.stringMatching(/^[0-9a-z]{14}$/),
      jobId: JOB,
    });
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      'l0',
      claim?.frameKey,
      '44444444-4444-4444-8444-444444444440',
      null,
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

  it('dresses a place she names for its own weather, never her city (Liberty, 28 Oct)', async () => {
    const { run, generateJson, destination, styling, ledger } = setup();
    await run({ mode: 'prompt', prompt: 'A weekend in Lisbon, walking a lot', date: '2026-10-17' });
    expect(destination).toHaveBeenCalledWith({
      name: 'Lisbon',
      date: '2026-10-17',
      home: { city: 'Dublin', lat: 53.3, lon: -6.2 },
      now: new Date('2026-10-15T09:00:00Z'),
    });
    const req = generateJson.mock.calls[0]?.[0];
    expect(req?.user).toContain(
      'She is dressing for Lisbon, Portugal, Saturday 17 October. Forecast there: 15–21°C, clear.',
    );
    expect(req?.user).not.toContain('Dublin');
    expect(req?.system).toContain(
      'the hero piece for the weather, the place and what she does there',
    );
    // The place rides on the set, so ↻ dresses the same place.
    expect((styling.createSet.mock.calls[0] as unknown[] | undefined)?.[1]).toMatchObject({
      data: { day: { place: { there: { place: 'Lisbon, Portugal' } } } },
    });
    // The ledger says which weather the look was dressed for, never the place she wrote.
    const detail = (ledger.record.mock.calls[0] as unknown[] | undefined)?.[0] as {
      detail?: Record<string, unknown>;
    };
    expect(detail.detail).toMatchObject({ place: { landscapes: [], wx: 'there' } });
    expect(JSON.stringify(detail.detail)).not.toContain('Lisbon');
  });

  it('builds the day around the pieces she chose, where she says she is (design 3k)', async () => {
    const { run, generateJson, forecast, destination, suggested, styling } = setup();
    const gone = '99999999-9999-4999-8999-999999999999';
    vi.mocked(styling.anchorPiece).mockImplementation((async (_u: unknown, id: string) =>
      id === PIECE
        ? { id: PIECE, label: 'Camel coat', imageAssetId: ASSET, wearFor: [] }
        : undefined) as never);
    await run({
      mode: 'prompt',
      prompt: 'the office',
      date: '2026-10-17',
      pieceIds: [PIECE, gone],
      place: { city: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
    });
    // The chip's place is read for its own weather, never geocoded from her words.
    expect(forecast).toHaveBeenCalledWith({
      city: 'Paris',
      lat: 48.86,
      lon: 2.35,
      date: '2026-10-17',
    });
    expect(destination).not.toHaveBeenCalled();
    const req = generateJson.mock.calls[0]?.[0];
    expect(req?.user).toContain('She is dressing for Paris, France, Saturday 17 October.');
    expect(req?.user).toContain('BUILD AROUND — she chose these pieces of hers');
    expect(req?.user.endsWith('Camel coat.')).toBe(true);
    // The piece she chose is on every rack, and rides on the set so ↻ keeps it.
    const specs = suggested.mintSet.mock.calls[0]?.[2] as ReturnType<typeof specFromWay>[];
    expect(specs.every((s) => s.pieces.some((p) => p.pieceId === PIECE))).toBe(true);
    expect((styling.createSet.mock.calls[0] as unknown[] | undefined)?.[1]).toMatchObject({
      data: { around: [{ pieceId: PIECE, label: 'Camel coat' }] },
    });
    // Her home city on the chip is just home.
    await run({
      mode: 'prompt',
      prompt: 'the office',
      place: { city: 'dublin', country: 'Ireland', lat: 53.3, lon: -6.2 },
    });
    expect(generateJson.mock.calls[1]?.[0]?.user).toContain('Dublin · October');
    expect(generateJson.mock.calls[1]?.[0]?.user).not.toContain('Forecast there');
    // The weather left out: no forecast is read, and none is written.
    forecast.mockClear();
    await run({ mode: 'prompt', prompt: 'the office', date: '2026-10-17', weather: false });
    expect(forecast).not.toHaveBeenCalled();
    expect(generateJson.mock.calls[2]?.[0]?.user).not.toContain('9–14°C');
  });

  it('renders THE PLACE for a landscape, keeping her weather only as a guide', async () => {
    const { run, generateJson, destination } = setup();
    await run({ mode: 'prompt', prompt: 'a coastal walk then lunch' });
    expect(destination).not.toHaveBeenCalled();
    const req = generateJson.mock.calls[0]?.[0];
    expect(req?.system).toContain('THE PLACE — the coast · walking.');
    expect(req?.user).toContain('Where she is now: Dublin · October | 9–14°C | light rain.');
    expect(req?.user).not.toContain('Dress the user for exactly this weather and place.');
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
      { frameKey: expect.stringMatching(/^[0-9a-z]{14}$/), jobId: JOB },
    );
    expect(suggested.setFrame).toHaveBeenCalledWith(
      USER,
      LOOK,
      expect.any(String),
      expect.any(String),
      null,
    );
    suggested.look.mockResolvedValueOnce(undefined as never);
    await expect(run({ mode: 'restyle', lookId: LOOK })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  // D21: her picture note stays with the look, so a re-dress draws it and keys its frame by it.
  it('keeps her picture note through a re-dress, in the frame and its key', async () => {
    const plain = setup();
    await plain.run({ mode: 'restyle', lookId: LOOK });
    const plainKey = (plain.suggested.rewrite.mock.calls[0] as unknown[])[3];
    expect(plain.generateImage.mock.calls[0]?.[0].prompt).not.toContain('HER NOTE');
    const noted = setup();
    const stored = await noted.suggested.look();
    noted.suggested.look.mockResolvedValueOnce({
      ...stored,
      look: { ...stored.look, pictureNote: 'sleeves rolled up' },
    } as never);
    await noted.run({ mode: 'restyle', lookId: LOOK });
    const claim = (noted.suggested.rewrite.mock.calls[0] as unknown[])[3] as { frameKey: string };
    expect(claim.frameKey).not.toBe((plainKey as { frameKey: string }).frameKey);
    expect((noted.suggested.setFrame.mock.calls[0] as unknown[])[2]).toBe(claim.frameKey);
    expect(noted.generateImage.mock.calls[0]?.[0].prompt).toContain(
      '<user_input>\nsleeves rolled up\n</user_input>',
    );
  });

  // The prompt box (plan 2026-11-03): her words make one draft for the day, not three suggestions.
  it('mints one draft for the day from the prompt box, its frame claimed with it', async () => {
    const { run, suggested, styling, writeStage, generateImage } = setup();
    await expect(
      run({ mode: 'prompt', draft: true, prompt: 'the office, then drinks', date: '2026-10-17' }),
    ).resolves.toEqual({ status: 'succeeded', artifactId: SET });
    const [, , specs, claim, opts] = suggested.mintSet.mock.calls[0] ?? [];
    expect((specs as unknown[]).length).toBe(1);
    expect((specs as ReturnType<typeof specFromWay>[])[0]?.dateHint).toBe('2026-10-17');
    expect(claim).toMatchObject({ setIndex: 0, jobId: JOB });
    expect(opts).toEqual({ status: 'draft' });
    expect((styling.createSet.mock.calls[0] as unknown[] | undefined)?.[1]).toMatchObject({
      data: {
        mode: 'prompt',
        draft: true,
        ways: [expect.objectContaining({ title: expect.any(String) })],
      },
    });
    expect(writeStage).toHaveBeenCalledWith('text', expect.objectContaining({ lookIds: ['l0'] }));
    // Design 1b: her draft is dressed on her model in the studio, never set in a scene.
    const prompt = generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(prompt).toContain('clean warm-grey studio backdrop');
    expect(prompt).not.toContain('real setting');
  });

  it('dresses a draft again from the same brief, with what she said is not right', async () => {
    const { run, generateJson, suggested, generateImage } = setup();
    suggested.look.mockResolvedValueOnce({
      look: {
        id: LOOK,
        name: 'Office, sharpened',
        status: 'draft',
        setId: SET,
        setIndex: 0,
        anchorPieceId: null,
        proposals: [],
        styling: null,
        frameAssetId: null,
        renderKey: null,
        dateHint: '2026-10-17',
      },
      pieces: [{ id: PIECE, label: 'Camel coat', category: 'Outerwear' }],
      siblings: [],
    } as never);
    await expect(
      run({ mode: 'restyle', lookId: LOOK, note: 'Too formal — softer shoes' }),
    ).resolves.toEqual({ status: 'succeeded' });
    const user = generateJson.mock.calls[0]?.[0].user ?? '';
    expect(user).toContain('Too formal — softer shoes');
    expect(user).not.toContain('A different look entirely');
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('clean warm-grey studio backdrop');
    expect(suggested.rewrite).toHaveBeenCalledWith(
      USER,
      LOOK,
      expect.objectContaining({ dateHint: '2026-10-17', setIndex: 0 }),
      expect.objectContaining({ jobId: JOB }),
    );
    // A saved look is never re-written.
    suggested.look.mockResolvedValueOnce({
      look: { id: LOOK, name: 'Kept', status: 'saved', setId: SET, setIndex: 0 },
      pieces: [],
      siblings: [],
    } as never);
    await expect(run({ mode: 'restyle', lookId: LOOK })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('steers by where she said the pieces come from, and never repeats what she has seen', async () => {
    const { run, generateJson, styling, suggested, ledger } = setup();
    await run({ anchor: { type: 'piece', pieceId: PIECE }, balance: 'new' });
    const system = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(system).toContain('she asked for NEW pieces');
    expect(system).toContain('ALREADY SHOWN');
    expect(system).toContain('- "Gallery night": Silk slip, Mules (asked: "Silk slip")');
    expect((styling.createSet.mock.calls[0] as unknown[] | undefined)?.[1]).toMatchObject({
      data: { balance: 'new', balanceNote: null },
    });
    // The acceptance read: her answer, the sets that rode along, owned/total per way.
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'looks.style_piece',
        status: 'ok',
        detail: { balance: 'new', shown: 1, owned_of_total: '0/3 0/3 0/3' },
      }),
    );
    // ↻ on one of the set's looks honours the answer the set was made with.
    styling.getSet.mockResolvedValueOnce({
      id: SET,
      title: 'Camel coat',
      generationJobId: JOB,
      data: {
        set: true,
        mode: 'prompt',
        anchor: { type: 'text', label: 'Brunch' },
        prompt: 'Brunch',
        dateHint: null,
        day: null,
        fallback: false,
        wearer: 'woman',
        ways: fake().ways,
        balance: null,
        balanceNote: 'two of mine',
      },
    } as never);
    await run({ mode: 'restyle', lookId: LOOK });
    expect(generateJson.mock.calls[1]?.[0].system).toContain(
      'WHERE THE PIECES COME FROM — in her own words: <user_input>\ntwo of mine',
    );
    expect(suggested.rewrite).toHaveBeenCalled();
  });

  it('with Shop on, names the pieces she wants and files one Robes picks as her wish (v7)', async () => {
    const out = fake();
    const way = out.ways[0];
    if (!way) throw new Error('no way');
    // Robes lists the wished piece by its exact label, as the prompt asks.
    way.pieces = way.pieces.map((p, i) => (i === 0 ? { ...p, name: 'Silk cami' } : p));
    const { run, generateJson, suggested } = setup(
      createFakeProvider({ 'looks.style_piece': () => out }),
    );
    await run({ anchor: { type: 'piece', pieceId: PIECE }, balance: 'mix' });
    const system = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(system).toContain('THE PIECES SHE WANTS');
    expect(system).toContain('Silk cami [Tops], coral, Vince');
    const specs = suggested.mintSet.mock.calls[0]?.[2] as ReturnType<typeof specFromWay>[];
    expect(specs[0]?.proposals[0]).toMatchObject({
      name: 'Silk cami',
      wishlisted: true,
      wishlistItemId: WISH,
    });
    expect(specs[0]?.proposals[1]).toMatchObject({ wishlisted: false, wishlistItemId: null });
    // Shop off: the wishlist stays out of the brief, and nothing is marked.
    await run({ anchor: { type: 'piece', pieceId: PIECE }, balance: 'owned' });
    expect(generateJson.mock.calls[1]?.[0].system).not.toContain('THE PIECES SHE WANTS');
    const later = suggested.mintSet.mock.calls[1]?.[2] as ReturnType<typeof specFromWay>[];
    expect(later[0]?.proposals[0]).toMatchObject({ name: 'Silk cami', wishlisted: false });
  });

  it('counts her own pieces per way, and logs that she wrote words, never the words', async () => {
    const { run, ledger } = setup(
      createFakeProvider({ 'looks.style_piece': () => fake({ closetSize: 1 }) }),
    );
    await run({ anchor: { type: 'piece', pieceId: PIECE }, balanceNote: 'two of mine, one new' });
    // One way used a piece of hers, two used none — the read is per way, not an average.
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { balance: 'words', shown: 1, owned_of_total: '1/3 0/3 0/3' },
      }),
    );
    // Her words themselves never reach the row.
    expect(JSON.stringify(ledger.record.mock.calls)).not.toContain('two of mine');
  });

  it('keeps the looks when the frame fails (UX-08), and rejects bad input', async () => {
    const ai = createFakeProvider({ 'looks.style_piece': () => fake() });
    vi.spyOn(ai, 'generateImage').mockRejectedValue(new AiError('blocked'));
    const { run, suggested } = setup(ai);
    await expect(run()).resolves.toMatchObject({ status: 'partial' });
    expect(suggested.mintSet).toHaveBeenCalled();
    expect(suggested.setFrame).not.toHaveBeenCalled();
    // The claim goes back, so she can ask for the frame again.
    expect(suggested.failFrame).toHaveBeenCalledWith(USER, 'l0', expect.any(String));
    await expect(run({ anchor: { type: 'text', text: 'x' } })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });
});

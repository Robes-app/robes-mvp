import { AiError, createFakeProvider } from '@robes/ai';
import { NO_ADJ, twinInputsOf, twinKey } from '@robes/core/avatar';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createAvatarCellHandler } from './avatar-cell';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');

function setup(status: string | null = 'pending', fail = false) {
  const cells = {
    get: vi.fn(async () =>
      status
        ? { id: 'k', status, jobId: null, contentType: null, bucketKey: null, claimedAt: null }
        : undefined,
    ),
    ready: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  if (fail) generateImage.mockRejectedValue(new AiError('provider'));
  const storage = { putObject: vi.fn(async (_key: string) => {}) };
  const handler = createAvatarCellHandler({
    ai,
    storage,
    cells,
    ledger: { record: vi.fn(async () => {}) },
  });
  const run = (cellKey: string) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { cellKey },
      signal: new AbortController().signal,
      writeStage: vi.fn(async () => {}),
      isCancelled: async () => false,
    });
  return { run, cells, storage, generateImage };
}

describe('avatar_cell', () => {
  it('draws the reference portrait once into the shared catalog', async () => {
    const { run, cells, storage, generateImage } = setup();
    await expect(run('w-s3-h1-nt@v2')).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('this is the reference portrait');
    expect(generateImage.mock.calls[0]?.[0].imageSize).toBeUndefined();
    expect(storage.putObject.mock.calls[0]?.[0]).toMatch(
      /^catalog\/avatar\/w-s3-h1-nt@v2\.(png|jpg|webp)$/,
    );
    expect(cells.ready).toHaveBeenCalledWith(
      'w-s3-h1-nt@v2',
      expect.stringMatching(/^catalog\//),
      expect.any(String),
    );
  });

  it('draws a Robes model by the twin prompt with no face: its age and size are words', async () => {
    const { run, cells, storage, generateImage } = setup();
    await expect(run('w-r3@v2')).resolves.toEqual({ status: 'succeeded' });
    const prompt = generateImage.mock.calls[0]?.[0].prompt ?? '';
    expect(prompt).toContain('62 years old');
    expect(prompt).toContain('soft silver grey hair');
    expect(prompt).not.toContain('IMAGE 1');
    expect(generateImage.mock.calls[0]?.[0].references).toBeUndefined();
    expect(storage.putObject.mock.calls[0]?.[0]).toMatch(/^catalog\/avatar\/w-r3@v2\./);
    expect(cells.ready).toHaveBeenCalledWith('w-r3@v2', expect.any(String), expect.any(String));
    await expect(run('m-r5@v2')).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage.mock.calls[1]?.[0].prompt).toContain('a fuller build');
  });

  it('does nothing for a cell that is already ready', async () => {
    const { run, generateImage } = setup('ready');
    await expect(run('w-s3-h1-nt@v2')).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('refuses keys outside the catalog and marks a failed draw so it can be retried', async () => {
    await expect(setup().run('../x@v2')).rejects.toEqual(new JobError('invalid_input'));
    const failing = setup('pending', true);
    await expect(failing.run('w-s3-h1-nt@v2')).rejects.toBeInstanceOf(JobError);
    expect(failing.cells.fail).toHaveBeenCalledWith('w-s3-h1-nt@v2');
  });
});

const CLOSE_UP = '22222222-2222-4222-8222-222222222222';
const TWIN_ASSET = '33333333-3333-4333-8333-333333333333';
const NEW_CLOSE_UP = '44444444-4444-4444-8444-444444444444';
const READ_JOB = '55555555-5555-4555-8555-555555555555';
const her = {
  genderIdentity: 'woman',
  avatarPrefs: { adj: { ...NO_ADJ, hips: 1 } },
  heightCm: 170,
  sizeUk: 12,
  bustBand: 34,
  bustCup: 'C',
  bustCm: null,
  waistCm: 72,
  ageBand: '35_44',
  bodyType: null,
  headshotAssetId: CLOSE_UP,
  skinHex: null as string | null,
  hairHex: null as string | null,
};

function twinSetup(
  row: typeof her | undefined = her,
  face: Uint8Array | null = new Uint8Array([1]),
  early: {
    // Her row as each load finds it (the read lands between them); the close-up's render; the read.
    rows?: (typeof her)[];
    photo?: { status: string } | undefined;
    reads?: ('reading' | 'read' | 'refused')[];
    // Generous, so a busy machine never times a wait out; short only where a wait must run out.
    readMs?: number;
  } = {},
) {
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  const rows = [...(early.rows ?? [])];
  const reads = [...(early.reads ?? [])];
  const model = {
    model: vi.fn(async () => {
      const next = rows.length > 1 ? rows.shift() : rows[0];
      return next ? { ...next } : row ? { ...row } : undefined;
    }),
    setTwin: vi.fn(async () => true),
    discardTwin: vi.fn(async () => {}),
    failTwin: vi.fn(async () => {}),
    standOnTwin: vi.fn(async () => {}),
    closeUp: vi.fn(async () => ('photo' in early ? early.photo : { status: 'ready' })),
    colourRead: vi.fn(async () => (reads.length > 1 ? reads.shift() : reads[0]) ?? 'read'),
  };
  const storage = {
    head: vi.fn(async () => null),
    getObject: vi.fn(async (key: string) => {
      if (!face) throw new Error('missing');
      expect(key).toMatch(new RegExp(`^media/${USER}/(${CLOSE_UP}|${NEW_CLOSE_UP})/master\\.jpg$`));
      return face;
    }),
    putObject: vi.fn(async (_key: string) => {}),
  };
  const handler = createAvatarCellHandler({
    ai,
    storage: { putObject: vi.fn(async () => {}) },
    cells: { get: vi.fn(), ready: vi.fn(), fail: vi.fn() },
    ledger: { record: vi.fn(async () => {}) },
    twin: {
      storage,
      model: model as never,
      styling: { createGeneratedAsset: vi.fn(async () => TWIN_ASSET) },
      waits: { photoMs: 5_000, readMs: early.readMs ?? 5_000, pollMs: 1 },
    },
  });
  const run = (key: string, input: Record<string, unknown> = {}) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { target: 'twin', twinKey: key, ...input },
      signal: new AbortController().signal,
      writeStage: vi.fn(async () => {}),
      isCancelled: async () => false,
    });
  return { run, generateImage, model, storage };
}

describe('avatar_cell · her twin', () => {
  it('draws her from her close-up and her line, and lands it on her own row', async () => {
    const key = await twinKey(twinInputsOf(her));
    const { run, generateImage, model, storage } = twinSetup();
    await expect(run(key)).resolves.toEqual({ status: 'succeeded' });
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.references).toHaveLength(1);
    expect(req?.prompt).toContain('IMAGE 1 is a photograph of this exact person');
    expect(req?.prompt).toContain('full hips, fuller than the shoulders');
    expect(req?.prompt).toContain('35 years old');
    // Her face must survive a full-length frame: the twin alone is drawn at 2K.
    expect(req?.imageSize).toBe('2K');
    expect(storage.putObject.mock.calls[0]?.[0]).toBe(`uploads/${USER}/${TWIN_ASSET}/original`);
    expect(model.setTwin).toHaveBeenCalledWith(USER, key, TWIN_ASSET);
    // Asked for by the app, the draw already stood her on it (drawTwin).
    expect(model.standOnTwin).not.toHaveBeenCalled();
    expect(model.discardTwin).not.toHaveBeenCalled();
  });

  it('discards a twin that lands after she deleted hers (or asked for another)', async () => {
    const key = await twinKey(twinInputsOf(her));
    const { run, model } = twinSetup();
    model.setTwin.mockResolvedValueOnce(false);
    await expect(run(key)).resolves.toEqual({ status: 'succeeded' });
    expect(model.discardTwin).toHaveBeenCalledWith(USER, TWIN_ASSET);
  });

  it('draws in words alone when the close-up cannot be read', async () => {
    const key = await twinKey(twinInputsOf(her));
    const { run, generateImage } = twinSetup(her, null);
    await expect(run(key)).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage.mock.calls[0]?.[0].references).toBeUndefined();
    expect(generateImage.mock.calls[0]?.[0].prompt).not.toContain('IMAGE 1');
  });

  it('skips a twin she has changed since asking, and marks a failed draw', async () => {
    const stale = twinSetup();
    await expect(stale.run('0'.repeat(24))).rejects.toEqual(new JobError('superseded'));
    expect(stale.generateImage).not.toHaveBeenCalled();
    const key = await twinKey(twinInputsOf(her));
    const failing = twinSetup();
    failing.generateImage.mockRejectedValue(new AiError('provider'));
    await expect(failing.run(key)).rejects.toBeInstanceOf(JobError);
    expect(failing.model.failTwin).toHaveBeenCalledWith(USER, key);
    await expect(twinSetup().run('not-a-key')).rejects.toEqual(new JobError('invalid_input'));
  });

  // Started with her colour read (10 Nov 2026): the new close-up isn't on her profile yet.
  const before = { ...her, headshotAssetId: CLOSE_UP, skinHex: '#8d5524' };
  const after = { ...before, headshotAssetId: NEW_CLOSE_UP, skinHex: '#e0ac69' };
  const early = { early: { closeUpAssetId: NEW_CLOSE_UP, readJobId: READ_JOB } };
  const earlyKey = () => twinKey({ ...twinInputsOf(before), closeUpAssetId: NEW_CLOSE_UP });

  it('draws from a close-up uploaded a moment ago and keeps it once the read takes the photo', async () => {
    const key = await earlyKey();
    // The read's colouring changes nothing the twin was drawn from.
    expect(await twinKey(twinInputsOf(after))).toBe(key);
    const { run, generateImage, model, storage } = twinSetup(her, new Uint8Array([1]), {
      rows: [before, after],
      photo: { status: 'pending' },
      reads: ['reading', 'reading', 'read'],
    });
    // Its master is stored before the renditions: the draw starts then.
    storage.head.mockResolvedValueOnce(null).mockResolvedValue({} as never);
    await expect(run(key, early)).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${NEW_CLOSE_UP}/master.jpg`);
    expect(generateImage.mock.calls[0]?.[0].references).toHaveLength(1);
    expect(model.colourRead).toHaveBeenCalledWith(USER, READ_JOB);
    expect(model.colourRead).toHaveBeenCalledTimes(3);
    expect(model.setTwin).toHaveBeenCalledWith(USER, key, TWIN_ASSET);
    // Her selfie wins over a Robes model she chose, even if the app's next ask comes late.
    expect(model.standOnTwin).toHaveBeenCalledWith(USER);
  });

  it('throws an early twin away when the read finds no face, or she changed something since', async () => {
    const key = await earlyKey();
    const noFace = twinSetup(her, new Uint8Array([1]), { rows: [before], reads: ['refused'] });
    await expect(noFace.run(key, early)).rejects.toEqual(new JobError('superseded'));
    expect(noFace.generateImage).toHaveBeenCalled();
    expect(noFace.storage.putObject).not.toHaveBeenCalled();
    expect(noFace.model.setTwin).not.toHaveBeenCalled();
    expect(noFace.model.standOnTwin).not.toHaveBeenCalled();
    expect(noFace.model.failTwin).toHaveBeenCalledWith(USER, key);
    // A read that never ends counts as no.
    const lost = twinSetup(her, new Uint8Array([1]), {
      rows: [before],
      reads: ['reading'],
      readMs: 20,
    });
    await expect(lost.run(key, early)).rejects.toEqual(new JobError('superseded'));
    // The read took it, but a slider moved meanwhile: the newer ask draws that.
    const moved = { ...after, avatarPrefs: { adj: { ...NO_ADJ, hips: 2 } } };
    const changed = twinSetup(her, new Uint8Array([1]), { rows: [before, moved] });
    await expect(changed.run(key, early)).rejects.toEqual(new JobError('superseded'));
    expect(changed.model.setTwin).not.toHaveBeenCalled();
  });

  it('never draws an early twin without its face: not hers, not rendered, or unreadable', async () => {
    const key = await earlyKey();
    for (const photo of [undefined, { status: 'failed' }]) {
      const t = twinSetup(her, new Uint8Array([1]), { rows: [before], photo });
      await expect(t.run(key, early)).rejects.toEqual(new JobError('unreadable_photo'));
      expect(t.generateImage).not.toHaveBeenCalled();
      expect(t.model.failTwin).toHaveBeenCalledWith(USER, key);
    }
    const faceless = twinSetup(her, null, { rows: [before] });
    await expect(faceless.run(key, early)).rejects.toEqual(new JobError('asset_missing'));
    expect(faceless.generateImage).not.toHaveBeenCalled();
  });
});

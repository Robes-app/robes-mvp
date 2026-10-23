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
    expect(storage.putObject.mock.calls[0]?.[0]).toMatch(
      /^catalog\/avatar\/w-s3-h1-nt@v2\.(png|jpg|webp)$/,
    );
    expect(cells.ready).toHaveBeenCalledWith(
      'w-s3-h1-nt@v2',
      expect.stringMatching(/^catalog\//),
      expect.any(String),
    );
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
  skinHex: null,
  hairHex: null,
};

function twinSetup(
  row: typeof her | undefined = her,
  face: Uint8Array | null = new Uint8Array([1]),
) {
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  const model = {
    model: vi.fn(async () => (row ? { ...row } : undefined)),
    setTwin: vi.fn(async () => true),
    failTwin: vi.fn(async () => {}),
  };
  const storage = {
    getObject: vi.fn(async (key: string) => {
      if (!face) throw new Error('missing');
      expect(key).toBe(`media/${USER}/${CLOSE_UP}/master.jpg`);
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
    },
  });
  const run = (key: string) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { target: 'twin', twinKey: key },
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
    expect(storage.putObject.mock.calls[0]?.[0]).toBe(`uploads/${USER}/${TWIN_ASSET}/original`);
    expect(model.setTwin).toHaveBeenCalledWith(USER, key, TWIN_ASSET);
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
});

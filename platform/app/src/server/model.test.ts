import { NO_ADJ, twinInputsOf, twinKey } from '@robes/core/avatar';
import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const CLOSE_UP = '33333333-3333-4333-8333-333333333333';
const TWIN = '44444444-4444-4444-8444-444444444444';
const base = {
  genderIdentity: 'woman',
  avatarPrefs: {} as unknown,
  heightCm: null,
  sizeUk: 12 as number | null,
  bustBand: null,
  bustCup: null,
  bustCm: null,
  waistCm: null,
  ageBand: null,
  modelPreset: null as number | null,
  filedCellId: 'w-s3-h1-nt' as string | null,
  twinAssetId: null as string | null,
  twinKey: null as string | null,
  twinDrawKey: null as string | null,
  twinDrawStatus: null as string | null,
  twinDrawAt: null as Date | null,
  bodyType: 'Pear' as string | null,
  headshotAssetId: CLOSE_UP as string | null,
  skinHex: null,
  hairHex: null,
  colourRead: true,
  silhouetteRead: true,
};
let row = { ...base };
const repos = {
  model: {
    get: vi.fn(async (): Promise<unknown> => row),
    savePicks: vi.fn(async () => {}),
    savePreset: vi.fn(async () => {}),
    file: vi.fn(async () => {}),
    claimTwin: vi.fn(async () => true),
    failTwin: vi.fn(async () => {}),
    deleteTwin: vi.fn(async () => {}),
  },
  avatarCells: {
    get: vi.fn(async (_key: string): Promise<unknown> => undefined),
    claim: vi.fn(async () => false),
    setJob: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  },
  assets: {
    getForUser: vi.fn(async (_u: unknown, id: string) => ({
      id,
      status: 'ready',
      renditions: {},
    })),
  },
  capacity: { isExhausted: vi.fn(async () => false) },
  looks: {
    renderState: vi.fn(async (): Promise<unknown> => ({ renderStatus: null })),
    get: vi.fn(async (): Promise<unknown> => look),
    piecesFor: vi.fn(async () => [{ id: 'piece-1' }]),
    claimRender: vi.fn(async () => true),
    setPictureNote: vi.fn(async () => true),
    setRenderJob: vi.fn(async () => {}),
    releaseRender: vi.fn(async () => {}),
  },
  jobs: {
    getForUser: vi.fn(async () => undefined),
    latest: vi.fn(async (): Promise<unknown> => undefined),
  },
};
const LOOK = '55555555-5555-4555-8555-555555555555';
let look: Record<string, unknown> = { status: 'draft', frameAssetId: null, styling: {} };
const startJob = vi.fn(async () => ({ jobId: 'job', status: 'queued' }));
const createAndEnqueueJob = vi.fn(async () => ({ jobId: 'cell-job', status: 'queued' }));
vi.mock('./db', () => ({ repos }));
vi.mock('./jobs', () => ({ startJob, createAndEnqueueJob }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn() } }));
vi.mock('./flags', () => ({ isFlagEnabled: vi.fn(async () => true) }));
vi.mock('./media', () => ({
  mediaDelivery: { url: vi.fn(async (k: string) => `https://m.test/${k}`) },
}));
vi.mock('./asset-urls', () => ({
  signedRenditions: vi.fn(async (_d: unknown, _u: string, a: { id: string }) => ({
    master: `https://m.test/${a.id}.jpg`,
    renditions: [],
  })),
}));

const {
  deleteTwin,
  drawTwin,
  drawTwinFromSelfie,
  ensureRobesModels,
  loadModel,
  renderOnModel,
  updateModel,
} = await import('./model');
const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const req = new Request('https://robes.test/api/v1/me/model/twin', { method: 'POST' });

beforeEach(() => {
  vi.clearAllMocks();
  row = { ...base };
  look = { status: 'draft', frameAssetId: null, styling: {} };
  repos.model.get.mockImplementation(async () => row);
  repos.model.savePicks.mockImplementation(async () => {});
  repos.avatarCells.get.mockImplementation(async () => undefined);
  repos.avatarCells.claim.mockImplementation(async () => false);
  repos.jobs.latest.mockImplementation(async () => undefined);
});

describe('her twin', () => {
  it('draws once for what she has now, as a job on her image quota', async () => {
    const key = await twinKey(twinInputsOf(row));
    await drawTwin(USER, req);
    expect(repos.model.claimTwin).toHaveBeenCalledWith(USER, key);
    expect(startJob).toHaveBeenCalledWith(USER, req, {
      kind: 'avatar_cell',
      input: { target: 'twin', twinKey: key },
      quota: { metric: 'generation.image', cost: 1 },
    });
  });

  it('never draws an unchanged twin twice, and gives a claim back when the draw cannot start', async () => {
    repos.model.claimTwin.mockResolvedValueOnce(false);
    await drawTwin(USER, req);
    expect(startJob).not.toHaveBeenCalled();
    repos.capacity.isExhausted.mockResolvedValueOnce(true);
    await drawTwin(USER, req);
    expect(repos.model.failTwin).toHaveBeenCalled();
  });

  it('draws nothing from nothing: the catalog model stands', async () => {
    row = {
      ...base,
      sizeUk: null,
      headshotAssetId: null,
      bodyType: null,
      avatarPrefs: {},
    };
    await drawTwin(USER, req);
    expect(repos.model.claimTwin).not.toHaveBeenCalled();
  });

  it('shows the twin on file, says when it answers to what she has now, and seeds the sliders once', async () => {
    const key = await twinKey(twinInputsOf(row));
    row = { ...base, twinAssetId: TWIN, twinKey: key };
    const m = await loadModel(USER);
    expect(m.twin).toEqual({
      status: 'ready',
      current: true,
      imageUrl: `https://m.test/${TWIN}.jpg`,
    });
    expect(m.closeUpUrl).toBe(`https://m.test/${CLOSE_UP}.jpg`);
    // A legacy line read seeds the sliders until she moves one.
    expect(m.adj).toEqual({ ...NO_ADJ, hips: 1 });
    row = { ...row, twinDrawKey: 'other', twinDrawStatus: 'pending', twinDrawAt: new Date() };
    row.sizeUk = 14;
    const stale = await loadModel(USER);
    expect(stale.twin).toMatchObject({ status: 'none', current: false });
  });

  it('merges a moved scale over the sliders as they stand; {} is back to her facts', async () => {
    await updateModel(USER, req, { adj: { bust: 2 } });
    expect(repos.model.savePicks).toHaveBeenLastCalledWith(
      USER,
      { adj: { shoulders: null, bust: 2, hips: 1 } },
      undefined,
    );
    await updateModel(USER, req, { adj: {} });
    expect(repos.model.savePicks).toHaveBeenLastCalledWith(USER, { adj: NO_ADJ }, undefined);
  });

  it('a twin drawn anew stands over a Robes model she chose: the selfie wins', async () => {
    row = { ...base, modelPreset: 3 };
    await drawTwin(USER, req);
    expect(repos.model.savePreset).toHaveBeenCalledWith(USER, null);
    repos.model.savePreset.mockClear();
    repos.model.claimTwin.mockResolvedValueOnce(false);
    await drawTwin(USER, req);
    expect(repos.model.savePreset).not.toHaveBeenCalled();
  });
});

describe('her selfie’s twin, drawn while its colouring is read', () => {
  const NEW = '66666666-6666-4666-8666-666666666666';
  const READ = '77777777-7777-4777-8777-777777777777';
  const selfie = { closeUpAssetId: NEW, readJobId: READ };
  const keyed = () => twinKey({ ...twinInputsOf(row), closeUpAssetId: NEW });

  it('starts from the new close-up on a job of its own, never the read’s Idempotency-Key', async () => {
    const ask = new Request('https://robes.test/api/v1/me/style/analyse', {
      method: 'POST',
      headers: { 'idempotency-key': '88888888-8888-4888-8888-888888888888' },
    });
    const key = await keyed();
    await drawTwinFromSelfie(USER, ask, selfie);
    expect(repos.model.claimTwin).toHaveBeenCalledWith(USER, key);
    expect(createAndEnqueueJob).toHaveBeenCalledWith(
      USER,
      {
        kind: 'avatar_cell',
        input: { target: 'twin', twinKey: key, early: selfie },
        quota: { metric: 'generation.image', cost: 1 },
      },
      undefined,
    );
    expect(startJob).not.toHaveBeenCalled();
  });

  it('starts nothing for the twin she already has, or a draw already claimed', async () => {
    row = { ...base, twinAssetId: TWIN, twinKey: await keyed() };
    await drawTwinFromSelfie(USER, req, selfie);
    expect(repos.model.claimTwin).not.toHaveBeenCalled();
    row = { ...base };
    repos.model.claimTwin.mockResolvedValueOnce(false);
    await drawTwinFromSelfie(USER, req, selfie);
    expect(createAndEnqueueJob).not.toHaveBeenCalled();
  });

  it('draws nothing while her colour read runs: the selfie’s twin is on its way', async () => {
    const reading = (over: Record<string, unknown> = {}) => ({
      status: 'running',
      input: { kind: 'colour', assetId: NEW },
      createdAt: new Date(),
      ...over,
    });
    repos.jobs.latest.mockResolvedValueOnce(reading());
    await drawTwin(USER, req);
    expect(repos.model.claimTwin).not.toHaveBeenCalled();
    // A read lost long ago, or a silhouette read, holds nothing up.
    for (const over of [
      { createdAt: new Date(Date.now() - 6 * 60_000) },
      { input: { kind: 'silhouette', assetId: NEW } },
      { status: 'succeeded' },
    ]) {
      repos.jobs.latest.mockResolvedValueOnce(reading(over));
      await drawTwin(USER, req);
    }
    expect(repos.model.claimTwin).toHaveBeenCalledTimes(3);
  });

  it('once the read lands, the ask finds it drawing: nothing new starts, and the selfie wins', async () => {
    const key = await twinKey(twinInputsOf({ ...base, headshotAssetId: NEW }));
    row = {
      ...base,
      headshotAssetId: NEW,
      modelPreset: 3,
      twinDrawKey: key,
      twinDrawStatus: 'pending',
      twinDrawAt: new Date(),
    };
    repos.model.claimTwin.mockResolvedValueOnce(false);
    const m = await drawTwin(USER, req);
    expect(startJob).not.toHaveBeenCalled();
    expect(repos.model.savePreset).toHaveBeenCalledWith(USER, null);
    expect(m.twin.status).toBe('pending');
  });
});

describe('a Robes model chosen', () => {
  it('is remembered as a pick, never as skin and hair, and its portraits are drawn once', async () => {
    row = { ...base, filedCellId: null };
    repos.avatarCells.claim.mockResolvedValue(true);
    await updateModel(USER, req, { preset: 4 });
    expect(repos.model.savePreset).toHaveBeenCalledWith(USER, 4);
    expect(repos.model.savePicks).not.toHaveBeenCalled();
    expect(repos.model.file).not.toHaveBeenCalled();
    expect(repos.avatarCells.claim.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      'w-r1@v2',
      'w-r2@v2',
      'w-r3@v2',
      'w-r4@v2',
      'w-r5@v2',
    ]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('is not hers to shape: a hand pick while a Robes model stands is a conflict', async () => {
    row = { ...base, modelPreset: 2 };
    await expect(updateModel(USER, req, { hair: 5 })).rejects.toMatchObject({ code: 'conflict' });
    row = { ...base, filedCellId: null };
    await expect(updateModel(USER, req, { adj: { hips: 1 } })).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(repos.model.savePicks).not.toHaveBeenCalled();
    // Her gender alone shapes nothing; her own model, hers to shape.
    await updateModel(USER, req, { presence: 'man' });
    expect(repos.model.savePicks).toHaveBeenCalledWith(USER, {}, 'man');
    row = { ...base, twinAssetId: TWIN, twinKey: 'k' };
    await updateModel(USER, req, { hair: 5 });
    expect(repos.model.savePicks).toHaveBeenLastCalledWith(USER, { hair: 5 }, undefined);
    expect(repos.model.savePreset).not.toHaveBeenCalled();
  });

  it('moves her to the other wearer’s five when her gender changes, filing and charging nothing', async () => {
    row = { ...base, filedCellId: null };
    repos.model.savePicks.mockImplementation(async () => {
      row = { ...row, genderIdentity: 'man' };
    });
    repos.avatarCells.claim.mockResolvedValue(true);
    await updateModel(USER, req, { presence: 'man' });
    expect(repos.model.savePicks).toHaveBeenCalledWith(USER, {}, 'man');
    expect(repos.model.file).not.toHaveBeenCalled();
    expect(startJob).not.toHaveBeenCalled();
    expect(repos.avatarCells.claim.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      'm-r1@v2',
      'm-r2@v2',
      'm-r3@v2',
      'm-r4@v2',
      'm-r5@v2',
    ]);
  });

  it('shows which one, with all five for her wearer', async () => {
    row = { ...base, genderIdentity: 'man', modelPreset: 5, filedCellId: null };
    repos.avatarCells.get.mockImplementation(async (key: string) =>
      key === 'm-r5@v2' ? readyCell(key) : undefined,
    );
    const m = await loadModel(USER);
    expect(m.preset).toBe(5);
    expect(m.robesModels.map((r) => [r.id, r.n, r.status])).toEqual([
      ['m-r1', 1, 'none'],
      ['m-r2', 2, 'none'],
      ['m-r3', 3, 'none'],
      ['m-r4', 4, 'none'],
      ['m-r5', 5, 'ready'],
    ]);
    expect(m.robesModels[4]?.imageUrl).toBe('https://m.test/catalog/avatar/m-r5@v2.png');
    expect(m.stand).toEqual({
      imageUrl: 'https://m.test/catalog/avatar/m-r5@v2.png',
      generic: true,
      on: 'robes',
    });
  });
});

describe('the Robes models', () => {
  it('draws the five portraits for her wearer, off her quota and her request', async () => {
    row = { ...base, genderIdentity: 'man', filedCellId: null };
    repos.avatarCells.claim.mockResolvedValue(true);
    await ensureRobesModels(USER);
    expect(repos.avatarCells.claim.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      'm-r1@v2',
      'm-r2@v2',
      'm-r3@v2',
      'm-r4@v2',
      'm-r5@v2',
    ]);
    expect(createAndEnqueueJob).toHaveBeenCalledWith(USER, {
      kind: 'avatar_cell',
      input: { cellKey: 'm-r1@v2' },
    });
    expect(startJob).not.toHaveBeenCalled();
  });

  it('are drawn when he lands on his model, for an account onboarded before they were', async () => {
    row = {
      ...base,
      genderIdentity: 'man',
      filedCellId: null,
      sizeUk: null,
      headshotAssetId: null,
    };
    repos.avatarCells.claim.mockResolvedValue(true);
    await drawTwin(USER, req);
    expect(repos.avatarCells.claim).toHaveBeenCalledWith('m-r1@v2');
    expect(createAndEnqueueJob).toHaveBeenCalledTimes(5);
  });

  it('stands down for an account on her own model, and for a cell already claimed', async () => {
    row = { ...base, filedCellId: 'w-s3-h1-hg' };
    await ensureRobesModels(USER);
    expect(repos.avatarCells.claim).not.toHaveBeenCalled();
    row = { ...base, filedCellId: null };
    repos.avatarCells.claim.mockResolvedValue(false);
    await ensureRobesModels(USER);
    expect(createAndEnqueueJob).not.toHaveBeenCalled();
  });
});

describe('her twin, deleted', () => {
  it('deletes it from her own rows, then stands her looks on a Robes model, drawn if need be', async () => {
    const after = {
      ...base,
      sizeUk: null,
      bodyType: null,
      headshotAssetId: null,
      colourRead: false,
      silhouetteRead: false,
      filedCellId: null,
      avatarPrefs: null,
    };
    repos.model.deleteTwin.mockImplementation(async () => {
      row = after;
    });
    repos.avatarCells.claim.mockResolvedValue(true);
    const model = await deleteTwin(USER, { source: 'ios' });
    expect(repos.model.deleteTwin).toHaveBeenCalledWith(USER, 'ios');
    expect(createAndEnqueueJob).toHaveBeenCalledWith(USER, {
      kind: 'avatar_cell',
      input: { cellKey: 'w-r1@v2' },
    });
    expect(model).toMatchObject({ closeUpUrl: null, stand: { on: 'robes' } });
    expect(model.twin.imageUrl).toBeNull();
    // Nothing is left to draw her from, so a visit after never draws a twin again.
    await drawTwin(USER, req);
    expect(repos.model.claimTwin).not.toHaveBeenCalled();
    expect(startJob).not.toHaveBeenCalled();
  });
});

const readyCell = async (key: string): Promise<unknown> => ({
  status: 'ready',
  bucketKey: `catalog/avatar/${key}.png`,
});

describe('what a new look stands on', () => {
  it('stands on the first Robes model while she has none of her own', async () => {
    row = { ...base, filedCellId: null };
    repos.avatarCells.get.mockImplementation(readyCell);
    expect((await loadModel(USER)).stand).toEqual({
      imageUrl: 'https://m.test/catalog/avatar/w-r1@v2.png',
      generic: true,
      on: 'robes',
    });
  });

  it('stands on her twin, else her filed cell; a Robes model she chose over either', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    expect((await loadModel(USER)).stand).toEqual({
      imageUrl: 'https://m.test/catalog/avatar/w-s3-h1-nt@v2.png',
      generic: false,
      on: 'cell',
    });
    row = { ...base, twinAssetId: TWIN, twinKey: 'k' };
    expect((await loadModel(USER)).stand).toEqual({
      imageUrl: `https://m.test/${TWIN}.jpg`,
      generic: false,
      on: 'twin',
    });
    row = { ...base, twinAssetId: TWIN, twinKey: 'k', modelPreset: 2 };
    expect((await loadModel(USER)).stand).toMatchObject({
      imageUrl: 'https://m.test/catalog/avatar/w-r2@v2.png',
      on: 'robes',
    });
  });
});

describe('a look on her model', () => {
  it('dresses a draft as she builds it, keyed by the model it stands on', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    await renderOnModel(USER, req, LOOK);
    const key = (repos.looks.claimRender.mock.calls[0] as unknown[])[2] as string;
    expect(key).toMatch(/^w-s3-h1-nt@v2:[\w-]{22}$/);
    expect(startJob).toHaveBeenCalledWith(USER, req, {
      kind: 'look_render',
      input: { target: 'look', lookId: LOOK, renderKey: key },
      quota: { metric: 'generation.image', cost: 1 },
    });
  });

  it('stands a look on the Robes model while she has none, drawing it first if need be', async () => {
    row = { ...base, filedCellId: null, modelPreset: 4 };
    await expect(renderOnModel(USER, req, LOOK)).rejects.toMatchObject({ code: 'conflict' });
    expect(repos.avatarCells.claim).toHaveBeenCalledWith('w-r4@v2');
    expect(startJob).not.toHaveBeenCalled();
    repos.avatarCells.get.mockImplementation(readyCell);
    await renderOnModel(USER, req, LOOK);
    expect((repos.looks.claimRender.mock.calls[0] as unknown[])[2]).toMatch(/^w-r4@v2:/);
  });

  it('stands a look on her twin once drawn, keyed by the twin', async () => {
    row = { ...base, twinAssetId: TWIN, twinKey: 'k' };
    await renderOnModel(USER, req, LOOK);
    expect((repos.looks.claimRender.mock.calls[0] as unknown[])[2]).toMatch(/^twin:k:/);
  });

  it('never draws over Robes’ frame, nor a suggestion', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    look = { status: 'draft', frameAssetId: 'f', styling: {} };
    await expect(renderOnModel(USER, req, LOOK)).rejects.toMatchObject({ code: 'conflict' });
    look = { status: 'suggested', frameAssetId: null, styling: {} };
    await expect(renderOnModel(USER, req, LOOK)).rejects.toMatchObject({ code: 'conflict' });
    expect(startJob).not.toHaveBeenCalled();
  });

  // D21: the AdjustSheet's Send writes her note on the look, then draws again with it.
  it('writes her picture note first and draws again, the note part of the key', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    await renderOnModel(USER, req, LOOK);
    const plain = (repos.looks.claimRender.mock.calls[0] as unknown[])[2] as string;
    expect((repos.looks.claimRender.mock.calls[0] as unknown[])[3]).toEqual({ force: false });
    expect(repos.looks.setPictureNote).not.toHaveBeenCalled();
    vi.clearAllMocks();
    await renderOnModel(USER, req, LOOK, { note: 'sleeves rolled up' });
    expect(repos.looks.setPictureNote).toHaveBeenCalledWith(USER, LOOK, 'sleeves rolled up');
    const [, , noted, opts] = repos.looks.claimRender.mock.calls[0] as unknown[];
    expect(noted).not.toBe(plain);
    expect(opts).toEqual({ force: true });
    // The job carries ids and intent only: the worker reads her note from the look.
    expect(JSON.stringify(startJob.mock.calls[0])).not.toContain('sleeves');
  });

  it('keeps the note already on the look, and an empty one clears it', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    look = { status: 'saved', frameAssetId: null, styling: {}, pictureNote: 'hair up' };
    await renderOnModel(USER, req, LOOK);
    const kept = (repos.looks.claimRender.mock.calls[0] as unknown[])[2];
    vi.clearAllMocks();
    await renderOnModel(USER, req, LOOK, { note: 'hair up' });
    expect((repos.looks.claimRender.mock.calls[0] as unknown[])[2]).toBe(kept);
    vi.clearAllMocks();
    look = { status: 'saved', frameAssetId: null, styling: {} };
    await renderOnModel(USER, req, LOOK);
    const bare = (repos.looks.claimRender.mock.calls[0] as unknown[])[2];
    vi.clearAllMocks();
    look = { status: 'saved', frameAssetId: null, styling: {}, pictureNote: 'hair up' };
    await renderOnModel(USER, req, LOOK, { note: '' });
    expect(repos.looks.setPictureNote).toHaveBeenCalledWith(USER, LOOK, '');
    expect((repos.looks.claimRender.mock.calls[0] as unknown[])[2]).toBe(bare);
  });

  it('writes no note on a look it can’t draw, nor on one that is not hers', async () => {
    repos.avatarCells.get.mockImplementation(readyCell);
    look = { status: 'draft', frameAssetId: 'f', styling: {} };
    await expect(renderOnModel(USER, req, LOOK, { note: 'cuffed' })).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(repos.looks.setPictureNote).not.toHaveBeenCalled();
    look = { status: 'draft', frameAssetId: null, styling: {} };
    repos.looks.setPictureNote.mockResolvedValueOnce(false);
    await expect(renderOnModel(USER, req, LOOK, { note: 'cuffed' })).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(startJob).not.toHaveBeenCalled();
  });
});

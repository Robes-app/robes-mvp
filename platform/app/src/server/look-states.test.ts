import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const repos = {
  looks: {
    get: vi.fn(),
    save: vi.fn(),
    piecesFor: vi.fn(async () => [{ id: 'p1' }]),
    setPictureNote: vi.fn(async () => true),
    claimFrame: vi.fn(async () => true),
    setRenderJob: vi.fn(),
    releaseRender: vi.fn(),
    renderState: vi.fn(),
  },
  profiles: { get: vi.fn() },
  plan: { pin: vi.fn() },
  capacity: { isExhausted: vi.fn(async () => false) },
  jobs: { getForUser: vi.fn() },
};
const startJob = vi.fn(async () => ({ jobId: 'job', status: 'queued' }));
vi.mock('./db', () => ({ repos }));
vi.mock('./looks-entity', () => ({ toLook: vi.fn(async (_u, row) => row), toLooks: vi.fn() }));
vi.mock('./jobs', () => ({ startJob }));
vi.mock('./model', () => ({ ensureRobesModels: vi.fn() }));
vi.mock('./flags', () => ({ isFlagEnabled: vi.fn() }));

const { saveLook, isUnnamedHandBuilt, requestFrame } = await import('./look-states');
const { frameKey } = await import('@robes/core/looks');
// biome-ignore lint/suspicious/noExplicitAny: a test id
const USER = 'u1' as any;
const draft = { status: 'draft', nameProvisional: true, source: 'manual', setId: null };

describe('saving an unnamed look', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repos.looks.save.mockResolvedValue({ id: 'l1' });
    repos.profiles.get.mockResolvedValue({ timezone: 'Europe/Dublin' });
  });

  it('names a hand-built draft for her today, kept provisional', async () => {
    repos.looks.get.mockResolvedValue(draft);
    repos.profiles.get.mockResolvedValue({ timezone: 'Australia/Sydney' });
    // 14:00 UTC on the 27th is already the 28th in Sydney: her day, not the server's.
    await saveLook(USER, 'l1', {}, new Date('2026-10-27T14:00:00Z'));
    expect(repos.looks.save).toHaveBeenCalledWith(USER, 'l1', {
      name: undefined,
      datedName: 'Wednesday 28 Oct',
    });
    expect(repos.plan.pin).not.toHaveBeenCalled();
  });

  it('keeps a typed name, and Robes’ names on Robes’ looks', async () => {
    repos.looks.get.mockResolvedValue(draft);
    await saveLook(USER, 'l1', { name: 'Gallery day' });
    expect(repos.looks.save).toHaveBeenLastCalledWith(USER, 'l1', {
      name: 'Gallery day',
      datedName: undefined,
    });
    expect(isUnnamedHandBuilt({ ...draft, source: 'generated' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, setId: 's1' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, status: 'suggested' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, nameProvisional: false })).toBe(false);
  });

  it('is not_found for a look that is not hers', async () => {
    repos.looks.get.mockResolvedValue(undefined);
    await expect(saveLook(USER, 'l1', {})).rejects.toMatchObject({ code: 'not_found' });
    expect(repos.looks.save).not.toHaveBeenCalled();
    expect(repos.plan.pin).not.toHaveBeenCalled();
  });

  // The diary's draft (plan 2026-11-03 D5): Save pins it to the day the chip named, one act.
  it('pins the saved look to the day the diary asked for', async () => {
    repos.looks.get.mockResolvedValue({ ...draft, source: 'generated', setId: 's1' });
    await saveLook(USER, 'l1', { date: '2026-11-04' });
    expect(repos.looks.save).toHaveBeenCalledWith(USER, 'l1', {
      name: undefined,
      datedName: undefined,
    });
    expect(repos.plan.pin).toHaveBeenCalledWith(USER, 'l1', ['2026-11-04'], { slot: 'day' });
  });
});

// D21: the AdjustSheet's Send on a look Robes framed writes her note, then re-dresses the frame.
describe('redrawing Robes’ frame with her picture note', () => {
  const framed = { status: 'saved', frameAssetId: 'f1', setId: 's1', proposals: [], styling: {} };
  const req = new Request('https://robes.test/api/v1/looks/l1/frame', { method: 'POST' });
  beforeEach(() => {
    vi.clearAllMocks();
    repos.looks.get.mockResolvedValue(framed);
  });

  it('keys the frame by the rack alone without a note, and asks for nothing new', async () => {
    await requestFrame(USER, req, 'l1');
    expect(repos.looks.setPictureNote).not.toHaveBeenCalled();
    expect(repos.looks.claimFrame).toHaveBeenCalledWith(USER, 'l1', frameKey(['p1'], [], {}), {
      force: false,
    });
  });

  it('writes her note, keys the frame by it and draws again', async () => {
    await requestFrame(USER, req, 'l1', { note: 'sleeves rolled up' });
    expect(repos.looks.setPictureNote).toHaveBeenCalledWith(USER, 'l1', 'sleeves rolled up');
    expect(repos.looks.claimFrame).toHaveBeenCalledWith(
      USER,
      'l1',
      frameKey(['p1'], [], {}, 'sleeves rolled up'),
      { force: true },
    );
    expect(startJob).toHaveBeenCalledWith(USER, req, {
      kind: 'look_render',
      input: {
        target: 'frame',
        lookId: 'l1',
        frameKey: frameKey(['p1'], [], {}, 'sleeves rolled up'),
      },
      quota: { metric: 'generation.image', cost: 1 },
    });
  });

  it('keeps the note on the look for a later redraw', async () => {
    repos.looks.get.mockResolvedValue({ ...framed, pictureNote: 'hair up' });
    await requestFrame(USER, req, 'l1');
    expect(repos.looks.claimFrame).toHaveBeenCalledWith(
      USER,
      'l1',
      frameKey(['p1'], [], {}, 'hair up'),
      { force: false },
    );
  });

  it('writes nothing on a look that is not hers, or one Robes never framed', async () => {
    repos.looks.get.mockResolvedValue(undefined);
    await expect(requestFrame(USER, req, 'l1', { note: 'x' })).rejects.toMatchObject({
      code: 'not_found',
    });
    repos.looks.get.mockResolvedValue({ ...framed, frameAssetId: null, setId: null });
    await expect(requestFrame(USER, req, 'l1', { note: 'x' })).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(repos.looks.setPictureNote).not.toHaveBeenCalled();
    expect(startJob).not.toHaveBeenCalled();
  });
});

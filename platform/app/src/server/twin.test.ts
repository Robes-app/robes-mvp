import { BriefListFull, verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock('./observations-flag', () => ({
  get WARDROBE_READ() {
    return flag.on;
  },
}));
const repos = {
  styleDna: {
    get: vi.fn(),
    updateTaste: vi.fn(async () => {}),
    setFacts: vi.fn(async () => {}),
    addLine: vi.fn(async (): Promise<boolean> => true),
    keepPending: vi.fn(async (): Promise<boolean> => false),
    dismissPending: vi.fn(async () => true),
    removeLine: vi.fn(async () => false),
  },
  styleMemory: { record: vi.fn(async () => {}) },
  styleProfile: { colourDna: vi.fn(), chooseSeason: vi.fn() },
  assets: { getManyForUser: vi.fn(async () => []) },
  capacity: { isExhausted: vi.fn(async () => false) },
  jobs: {
    latest: vi.fn(
      async (): Promise<
        { id: string; status: string; finishedAt: Date | null; updatedAt: Date } | undefined
      > => undefined,
    ),
  },
};
vi.mock('./db', () => ({ repos }));
vi.mock('./media', () => ({ mediaDelivery: { url: async (k: string) => `https://cdn/${k}` } }));
vi.mock('./jobs', () => ({ startJob: vi.fn(async () => ({ jobId: 'j', status: 'queued' })) }));

const twin = await import('./twin');
const { startJob } = await import('./jobs');
const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LINE = '33333333-3333-4333-8333-333333333333';
const at = new Date('2026-10-01T10:00:00Z');

const snapshot = (over: { readAt?: Date | null; pending?: boolean } = {}) => ({
  profile: {
    genderIdentity: 'woman',
    styleArchetypes: ['Minimal'],
    styleIcons: ['Hailey Bieber', 'Someone'],
    styleBrands: ['The Row'],
    investmentLevel: '500_1500',
    heightCm: 168,
    sizeUk: 10,
    shoeUk: 5.5,
    ageBand: '45_54',
  },
  style: {
    briefNotes: 'You dress well.',
    briefReadAt: over.readAt === undefined ? at : over.readAt,
    userOverrides: { loved_colors: ['navy'], rejected_colors: 'nope' },
  },
  lines: [
    {
      id: LINE,
      list: 'avoids',
      state: 'kept',
      text: 'Heels',
      fullText: null,
      because: null,
      source: 'typed',
      origin: 'her',
      chip: 'Heels',
      loved: [],
      rejected: [],
      keptAt: at,
      createdAt: at,
    },
    ...(over.pending
      ? [
          {
            id: '44444444-4444-4444-8444-444444444444',
            list: 'rules',
            state: 'pending',
            text: 'No double denim',
            fullText: null,
            because: 'You said it on “Saturday”',
            source: 'drafted',
            origin: 'prompt',
            chip: null,
            loved: [],
            rejected: [],
            keptAt: null,
            createdAt: at,
          },
        ]
      : []),
  ],
  heroes: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  repos.jobs.latest.mockResolvedValue(undefined);
});

describe('Style DNA server', () => {
  it('reads once, then a week after the last read, never while a line waits', () => {
    const now = at.getTime();
    expect(twin.readDue(null, 0, now)).toBe(true);
    expect(twin.readDue(at, 0, now + 6 * 86_400_000)).toBe(false);
    expect(twin.readDue(at, 0, now + 8 * 86_400_000)).toBe(true);
    expect(twin.readDue(null, 1, now)).toBe(false);
    expect(twin.readDue(null, 0, now, new Date(now - 60_000))).toBe(false);
    expect(twin.readDue(null, 0, now, new Date(now - twin.READ_BACKOFF_MS - 1))).toBe(true);
  });

  it('never reads her wardrobe while the read is paused', async () => {
    flag.on = false;
    try {
      expect(twin.readDue(null, 0, at.getTime())).toBe(false);
      repos.styleDna.get.mockResolvedValue(snapshot({ readAt: null }));
      expect((await twin.loadStyleDna(USER)).readDue).toBe(false);
      await expect(twin.startBriefRead(USER, new Request('http://x'))).rejects.toMatchObject({
        code: 'conflict',
      });
      expect(startJob).not.toHaveBeenCalled();
    } finally {
      flag.on = true;
    }
  });

  it('shapes her Style DNA from the rows, tags icons from the pool', async () => {
    repos.styleDna.get.mockResolvedValue(snapshot({ pending: true }));
    const dna = await twin.loadStyleDna(USER);
    expect(dna).toMatchObject({
      types: ['Minimal'],
      icons: [
        { name: 'Hailey Bieber', tag: 'Clean-girl minimal' },
        { name: 'Someone', tag: '' },
      ],
      investment: '500_1500',
      facts: { heightCm: 168, sizeUk: 10, shoeUk: 5.5, ageBand: '45_54' },
      brief: {
        avoids: [{ text: 'Heels', source: 'typed', chip: 'Heels' }],
        notes: 'You dress well.',
        colours: { loved: ['navy'], rejected: [] },
      },
      observations: [{ text: 'No double denim', origin: 'prompt' }],
      readDue: false,
    });
  });

  it('dedupes names case-insensitively and saves facts apart from taste', async () => {
    repos.styleDna.get.mockResolvedValue(snapshot());
    await twin.updateStyleDna(USER, { brands: ['COS', 'cos', 'Arket'], facts: { sizeUk: 12 } });
    expect(repos.styleDna.updateTaste).toHaveBeenCalledWith(USER, {
      styleArchetypes: undefined,
      styleBrands: ['COS', 'Arket'],
      styleIcons: undefined,
      investmentLevel: undefined,
    });
    expect(repos.styleDna.setFacts).toHaveBeenCalledWith(USER, { sizeUk: 12 });
  });

  it('is not_found for a line that is not hers or no longer waits', async () => {
    await expect(twin.answerObservation(USER, LINE, 'keep')).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(twin.removeBriefLine(USER, LINE)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('answers a full list with a 409 brief_list_full, from typing or keeping', async () => {
    repos.styleDna.addLine.mockRejectedValueOnce(new BriefListFull('rules'));
    await expect(
      twin.addBriefLine(USER, { list: 'rules', text: 'One too many' }),
    ).rejects.toMatchObject({
      code: 'conflict',
      extra: { details: { reason: 'brief_list_full' } },
    });
    repos.styleDna.keepPending.mockRejectedValueOnce(new BriefListFull('loves'));
    await expect(twin.answerObservation(USER, LINE, 'keep')).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('starts the read as a paid single-flight job carrying no input', async () => {
    repos.styleDna.get.mockResolvedValue(snapshot({ readAt: null }));
    const req = new Request('http://x');
    await twin.startBriefRead(USER, req);
    expect(startJob).toHaveBeenCalledWith(USER, req, {
      kind: 'style_brief',
      input: {},
      quota: { metric: 'generation.text', cost: 1 },
      singleFlight: true,
    });
    repos.capacity.isExhausted.mockResolvedValueOnce(true);
    await expect(twin.startBriefRead(USER, req)).rejects.toMatchObject({ code: 'capacity' });
  });

  it('returns the read in flight instead of starting another', async () => {
    repos.styleDna.get.mockResolvedValue(snapshot({ readAt: null }));
    repos.jobs.latest.mockResolvedValue({
      id: 'running-job',
      status: 'running',
      finishedAt: null,
      updatedAt: new Date(),
    });
    expect(await twin.startBriefRead(USER, new Request('http://x'))).toEqual({
      jobId: 'running-job',
      status: 'running',
    });
    expect(startJob).not.toHaveBeenCalled();
    expect((await twin.loadStyleDna(USER)).readDue).toBe(true);
  });

  it('backs off after a failed read, and never reads when not due', async () => {
    repos.styleDna.get.mockResolvedValue(snapshot({ readAt: null }));
    const failed = (ago: number) => ({
      id: 'failed-job',
      status: 'failed',
      finishedAt: new Date(Date.now() - ago),
      updatedAt: new Date(Date.now() - ago),
    });
    repos.jobs.latest.mockResolvedValue(failed(60_000));
    expect((await twin.loadStyleDna(USER)).readDue).toBe(false);
    await expect(twin.startBriefRead(USER, new Request('http://x'))).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(startJob).not.toHaveBeenCalled();
    repos.jobs.latest.mockResolvedValue(failed(twin.READ_BACKOFF_MS + 60_000));
    expect((await twin.loadStyleDna(USER)).readDue).toBe(true);
    await twin.startBriefRead(USER, new Request('http://x'));
    expect(startJob).toHaveBeenCalledTimes(1);

    repos.jobs.latest.mockResolvedValue(undefined);
    repos.styleDna.get.mockResolvedValue(snapshot({ readAt: new Date() }));
    await expect(twin.startBriefRead(USER, new Request('http://x'))).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('changes the season only on a colour read she has', async () => {
    repos.styleProfile.colourDna.mockResolvedValue(undefined);
    await expect(twin.chooseStyleSeason(USER, { season: 'True Autumn' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('records a swap without words and a verdict with them', async () => {
    await twin.recordMemory(USER, { kind: 'swap', pieceOut: 'Loafers', category: 'Shoes' });
    expect(repos.styleMemory.record).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ kind: 'swap', pieceOut: 'Loafers', body: null, verdict: null }),
    );
    await twin.recordMemory(USER, { kind: 'verdict', verdict: 0, body: 'too safe' });
    expect(repos.styleMemory.record).toHaveBeenLastCalledWith(
      USER,
      expect.objectContaining({ kind: 'verdict', verdict: 0, body: 'too safe' }),
    );
  });
});

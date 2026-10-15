import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const repos = {
  capacity: { isExhausted: vi.fn(async () => false) },
  assets: {
    getForUser: vi.fn(),
    discardCrops: vi.fn(async () => 0),
  },
  jobs: { getForUser: vi.fn() },
  wardrobe: {
    get: vi.fn(),
    createFromRead: vi.fn(),
    adoptPhoto: vi.fn(async () => false),
  },
  looks: { create: vi.fn(async () => ({ id: 'look-1' })), wear: vi.fn(async () => ({})) },
};
const startJob = vi.fn(async () => ({ jobId: 'job', status: 'queued' }));
vi.mock('./db', () => ({ repos }));
vi.mock('./jobs', () => ({ startJob }));
vi.mock('./wardrobe', () => ({ toPieces: vi.fn(async (_u: unknown, rows: unknown[]) => rows) }));
vi.mock('./looks-entity', () => ({
  suggestedName: vi.fn(async () => 'Suggested'),
  toLook: vi.fn(async (_u: unknown, row: unknown) => row),
  withOwnedPieces: (write: () => Promise<unknown>) => write(),
}));

const { fileRead, lookFromRead, startPhotoRead } = await import('./photo-reads');

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const JOB = '22222222-2222-4222-8222-222222222222';
const PHOTO = '33333333-3333-4333-8333-333333333333';
const SHOES = '44444444-4444-4444-8444-444444444444';
const crop = (i: number) => `5555555${i}-5555-4555-8555-555555555555`;

function readPiece(index: number, label: string, category: string) {
  return {
    index,
    label,
    category,
    categoryL2: null,
    categoryL3: null,
    color: null,
    brand: null,
    notes: null,
    box: { x: 0, y: 0, w: 1, h: 1 },
    match: null,
    cropAssetId: crop(index),
    price: null,
    currency: null,
    size: null,
    itemDna: { display: { title: label } },
  };
}

const READ = {
  assetId: PHOTO,
  readPieces: [
    readPiece(0, 'Cream long-sleeve t-shirt', 'Tops'),
    readPiece(1, 'Black leggings', 'Bottoms'),
    readPiece(2, 'White running shoes', 'Shoes'),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  repos.jobs.getForUser.mockResolvedValue({
    kind: 'wardrobe_pieces',
    status: 'succeeded',
    output: READ,
  });
  repos.wardrobe.get.mockImplementation(async (_u: unknown, id: string) =>
    id === SHOES ? { id: SHOES, imageAssetId: null } : undefined,
  );
  repos.wardrobe.createFromRead.mockImplementation(
    async (_u: unknown, _a: unknown, rows: Array<{ sourceIndex: number; label: string }>) =>
      rows.map((r) => ({
        id: `piece-${r.sourceIndex}`,
        sourceIndex: r.sourceIndex,
        label: r.label,
      })),
  );
});

describe('photo reads', () => {
  it('reads only her wardrobe or look photos', async () => {
    const req = new Request('http://x');
    repos.assets.getForUser.mockResolvedValueOnce({ kind: 'headshot', status: 'ready' });
    await expect(startPhotoRead(USER, req, PHOTO)).rejects.toMatchObject({ code: 'not_found' });
    repos.assets.getForUser.mockResolvedValueOnce({ kind: 'wardrobe', status: 'pending' });
    await startPhotoRead(USER, req, PHOTO);
    expect(startJob).toHaveBeenCalledWith(USER, req, {
      kind: 'wardrobe_pieces',
      input: { assetId: PHOTO },
      quota: { metric: 'analyse.photo', cost: 1 },
    });
  });

  it('answers only a finished read of hers', async () => {
    repos.jobs.getForUser.mockResolvedValueOnce(undefined);
    await expect(fileRead(USER, JOB, [{ index: 0, state: 'skip' }])).rejects.toMatchObject({
      code: 'not_found',
    });
    repos.jobs.getForUser.mockResolvedValueOnce({
      kind: 'key_piece',
      status: 'succeeded',
      output: {},
    });
    await expect(fileRead(USER, JOB, [{ index: 0, state: 'skip' }])).rejects.toMatchObject({
      code: 'not_found',
    });
    repos.jobs.getForUser.mockResolvedValueOnce({
      kind: 'wardrobe_pieces',
      status: 'running',
      output: {},
    });
    await expect(fileRead(USER, JOB, [{ index: 0, state: 'skip' }])).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('files nothing until every piece is answered once', async () => {
    await expect(
      fileRead(USER, JOB, [
        { index: 0, state: 'add' },
        { index: 0, state: 'skip' },
        { index: 1, state: 'skip' },
      ]),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(fileRead(USER, JOB, [{ index: 0, state: 'add' }])).rejects.toMatchObject({
      code: 'invalid_input',
    });
    expect(repos.wardrobe.createFromRead).not.toHaveBeenCalled();
  });

  it('files each kept piece with its crop and her edits; an owned piece takes the crop', async () => {
    repos.wardrobe.adoptPhoto.mockResolvedValueOnce(true);
    const out = await fileRead(USER, JOB, [
      { index: 0, state: 'add' },
      {
        index: 1,
        state: 'add',
        edits: { label: 'Black ribbed leggings', seasonBand: 'autumn_winter' },
      },
      { index: 2, state: 'owned', pieceId: SHOES },
    ]);
    const rows = repos.wardrobe.createFromRead.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(rows.map((r) => [r.sourceIndex, r.label, r.imageAssetId])).toEqual([
      [0, 'Cream long-sleeve t-shirt', crop(0)],
      [1, 'Black ribbed leggings', crop(1)],
    ]);
    expect(rows[1]).toMatchObject({
      seasonBand: 'autumn_winter',
      itemDna: { source: { kind: 'photo_multi', of: 3 } },
    });
    expect(repos.wardrobe.adoptPhoto).toHaveBeenCalledWith(USER, SHOES, crop(2));
    expect(repos.assets.discardCrops).toHaveBeenCalledWith(USER, PHOTO, []);
    expect(out.photoAdded).toEqual([SHOES]);
    expect(out.filed).toHaveLength(2);
  });

  it('never points a piece at a row that is not hers, and discards crops nobody took', async () => {
    await expect(
      fileRead(USER, JOB, [
        { index: 0, state: 'skip' },
        { index: 1, state: 'skip' },
        { index: 2, state: 'owned', pieceId: '66666666-6666-4666-8666-666666666666' },
      ]),
    ).rejects.toMatchObject({ code: 'not_found' });
    await fileRead(USER, JOB, [
      { index: 0, state: 'skip' },
      { index: 1, state: 'add' },
      { index: 2, state: 'owned', pieceId: SHOES },
    ]);
    expect(repos.assets.discardCrops).toHaveBeenCalledWith(USER, PHOTO, [crop(0), crop(2)]);
  });

  it('saves a look from the photo: new pieces filed first, hers hung, the photo as its record', async () => {
    await lookFromRead(USER, JOB, {
      answers: [
        { index: 0, state: 'skip' },
        { index: 1, state: 'new' },
        { index: 2, state: 'owned', pieceId: SHOES },
      ],
      name: 'Sunday run',
      wornOn: '2026-10-15',
    });
    expect(repos.wardrobe.createFromRead.mock.calls[0]?.[2]).toEqual([
      expect.objectContaining({
        sourceIndex: 1,
        label: 'Black leggings',
        itemDna: expect.objectContaining({ source: { kind: 'look_photo', of: 3 } }),
      }),
    ]);
    expect(repos.looks.create).toHaveBeenCalledWith(USER, {
      name: 'Sunday run',
      nameProvisional: false,
      pieces: [{ pieceId: 'piece-1' }, { pieceId: SHOES }],
      photoAssetId: PHOTO,
    });
    expect(repos.looks.wear).toHaveBeenCalledWith(USER, 'look-1', '2026-10-15');
    expect(repos.assets.discardCrops).toHaveBeenCalledWith(USER, PHOTO, [crop(0), crop(2)]);
  });

  it('suggests a name and logs no wear unless she asks', async () => {
    await lookFromRead(USER, JOB, {
      answers: [
        { index: 0, state: 'skip' },
        { index: 1, state: 'skip' },
        { index: 2, state: 'owned', pieceId: SHOES },
      ],
    });
    expect(repos.looks.create).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ name: 'Suggested', nameProvisional: true }),
    );
    expect(repos.looks.wear).not.toHaveBeenCalled();
  });
});

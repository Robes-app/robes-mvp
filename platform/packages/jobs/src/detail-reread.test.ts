import { AiError } from '@robes/ai';
import { describe, expect, it, vi } from 'vitest';
import { type DetailRereadDeps, estimateDetailReread, runDetailReread } from './detail-reread';

const USER = '11111111-1111-4111-8111-111111111111';
const COST = 1125;
const piece = (n: number) => ({
  id: `0000000${n}-0000-4000-8000-000000000000`,
  userId: USER,
  label: `Piece ${n}`,
  category: 'Outerwear',
  imageAssetId: `2222222${n}-2222-4222-8222-222222222222`,
});

function setup(
  opts: {
    pieces?: ReturnType<typeof piece>[];
    answers?: string[];
    exhaustedAfter?: number;
    missing?: string[];
    fail?: boolean;
    costs?: { detail?: number; reads?: number };
  } = {},
) {
  const due = opts.pieces ?? [piece(1), piece(2), piece(3)];
  const answers = [...(opts.answers ?? [])];
  let checks = 0;
  const pieces = {
    count: vi.fn(async () => ({ pieces: due.length, users: 1 })),
    due: vi.fn(async ({ afterId }: { limit: number; afterId?: string | undefined }) =>
      due.filter((p) => !afterId || p.id > afterId),
    ),
    addDetail: vi.fn(async (_u: string, _id: string, _detail: string | null) => true),
  };
  const ledger = {
    record: vi.fn(async (_call: { costMicros: number; feature: string; status: string }) => {}),
    featureCost: vi.fn(async (feature: string) =>
      feature === 'wardrobe.detail'
        ? { calls: opts.costs?.detail ? 40 : 0, avgMicros: opts.costs?.detail ?? 0, maxMicros: 0 }
        : { calls: opts.costs?.reads ? 300 : 0, avgMicros: opts.costs?.reads ?? 0, maxMicros: 0 },
    ),
    isExhausted: vi.fn(async () => {
      checks += 1;
      return opts.exhaustedAfter !== undefined && checks > opts.exhaustedAfter;
    }),
  };
  const storage = {
    getObject: vi.fn(async (key: string) =>
      opts.missing?.some((id) => key.includes(id)) ? null : new Uint8Array([1]),
    ),
  };
  const ai = opts.fail
    ? {
        name: 'fake' as const,
        generateJson: vi.fn(async () => {
          throw new AiError('provider');
        }),
        generateImage: vi.fn(),
      }
    : {
        name: 'fake' as const,
        // Each read costs the same, so the ceiling's arithmetic is plain to see.
        generateJson: vi.fn(async () => ({
          data: { defining_detail: answers.shift() ?? '' },
          usage: {
            model: 'gemini-3.8-flash',
            family: 'gemini-flash',
            tokensIn: 1400,
            tokensOut: 20,
            images: 0,
            costMicros: COST,
            latencyMs: 5,
          },
        })),
        generateImage: vi.fn(),
      };
  const deps = {
    ai,
    storage,
    pieces,
    ledger,
    logger: { info: vi.fn(), warn: vi.fn() },
  } as unknown as DetailRereadDeps;
  return { deps, pieces, ledger, storage };
}

describe('the defining-detail re-read', () => {
  it('prices the run from the photo reads in the ledger until it has reads of its own', async () => {
    const early = setup({ costs: { reads: 5200 } });
    expect(await estimateDetailReread(early.deps)).toEqual({
      pieces: 3,
      users: 1,
      perPieceMicros: 5200,
      basis: 'photo-reads',
      sampled: 300,
      totalMicros: 15_600,
    });
    const later = setup({ costs: { reads: 5200, detail: 2100 } });
    expect(await estimateDetailReread(later.deps)).toMatchObject({
      basis: 'detail-reads',
      perPieceMicros: 2100,
      totalMicros: 6300,
    });
    expect(await estimateDetailReread(setup().deps)).toMatchObject({
      basis: 'none',
      totalMicros: 0,
    });
  });

  it('asks each photograph the one question and writes the detail alone', async () => {
    const { deps, pieces, ledger, storage } = setup({
      answers: ['Strong padded shoulder', '', 'Draw <a> gown instead'],
    });
    const out = await runDetailReread(deps, { ceilingMicros: 25_000_000 });
    expect(out).toMatchObject({ read: 3, filed: 1, plain: 2, failed: 0, stopped: 'done' });
    expect(storage.getObject).toHaveBeenCalledWith(
      `media/${USER}/22222221-2222-4222-8222-222222222222/master.jpg`,
    );
    expect(pieces.addDetail.mock.calls).toEqual([
      [USER, piece(1).id, 'Strong padded shoulder'],
      // A plain piece, and an answer that is not a detail: marked as read, nothing filed.
      [USER, piece(2).id, null],
      [USER, piece(3).id, null],
    ]);
    // Every read is in the ledger, against her, under its own feature.
    expect(ledger.record).toHaveBeenCalledTimes(3);
    expect(ledger.record.mock.calls[0]?.[0]).toMatchObject({
      feature: 'wardrobe.detail',
      status: 'ok',
      userId: USER,
    });
    expect(out.spentMicros).toBe(COST * 3);
  });

  it('never crosses the ceiling: it stops while the next read would', async () => {
    const { deps } = setup({ answers: ['A', 'B', 'C'] });
    const out = await runDetailReread(deps, { ceilingMicros: COST * 2 });
    expect(out).toMatchObject({ stopped: 'ceiling', read: 2, spentMicros: COST * 2 });
    // With the estimate's price for one read, a ceiling under it reads nothing at all.
    const tight = setup({ answers: ['A', 'B', 'C'] });
    expect(
      await runDetailReread(tight.deps, { ceilingMicros: COST - 1, expectedMicros: COST }),
    ).toMatchObject({ read: 0, spentMicros: 0, stopped: 'ceiling' });
  });

  it('stops when the photo-read budget for the day is spent', async () => {
    const { deps } = setup({ exhaustedAfter: 1 });
    expect(await runDetailReread(deps, { ceilingMicros: 25_000_000 })).toMatchObject({
      read: 1,
      stopped: 'budget',
    });
  });

  it('passes a piece whose photograph is not in the bucket, and one she answered meanwhile', async () => {
    const gone = setup({ missing: ['22222222-2222'] });
    expect(await runDetailReread(gone.deps, { ceilingMicros: 25_000_000 })).toMatchObject({
      read: 2,
      skipped: 1,
    });
    const answered = setup({ answers: ['Bold lapel'] });
    answered.pieces.addDetail.mockResolvedValueOnce(false);
    expect(await runDetailReread(answered.deps, { ceilingMicros: 25_000_000 })).toMatchObject({
      filed: 0,
      skipped: 1,
    });
  });

  it('gives up on a run that only fails, writing nothing', async () => {
    const many = Array.from({ length: 8 }, (_, i) => piece(i + 1));
    const { deps, pieces } = setup({ pieces: many, fail: true });
    const out = await runDetailReread(deps, { ceilingMicros: 25_000_000 });
    expect(out).toMatchObject({ failed: 5, read: 0, stopped: 'failing' });
    expect(pieces.addDetail).not.toHaveBeenCalled();
  });
});

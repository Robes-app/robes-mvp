import { AiError, createFakeProvider } from '@robes/ai';
import { fakeOutput as dailyFake, normalise } from '@robes/ai/prompts/daily';
import { fakeOutput } from '@robes/ai/prompts/style-piece/v2';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createLookRenderHandler } from './look-render';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const IDEA = '55555555-5555-4555-8555-555555555555';
const DAILY = '77777777-7777-4777-8777-777777777777';
const JOB = '66666666-6666-4666-8666-666666666666';
const PIECE = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';

const ideaData = (anchor: object = { type: 'text', label: 'Camel coat' }) => ({
  anchor,
  fallback: false,
  wearer: 'woman',
  ways: fakeOutput('Camel coat').ways,
  images: [],
});

function setup(
  opts: { data?: object; daily?: object; ai?: ReturnType<typeof createFakeProvider> } = {},
) {
  const frames = {
    get: vi.fn(async (_u: string, id: string, type: string) =>
      type === 'idea' && id === IDEA
        ? { id, title: 'Camel coat', data: opts.data ?? ideaData(), generationJobId: null }
        : type === 'daily_look' && id === DAILY
          ? { id, title: 'Today', data: opts.daily, generationJobId: null }
          : undefined,
    ),
    set: vi.fn(async () => {}),
  };
  const styling = {
    context: vi.fn(async () => ({ styleIcons: ['Phoebe Philo'] })),
    dailyContext: vi.fn(async () => ({ gender: 'woman', styleIcons: [], homeCity: 'Dublin' })),
    anchorPiece: vi.fn(async () => ({ id: PIECE, label: 'Camel coat', imageAssetId: ASSET })),
    createGeneratedAsset: vi.fn(async () => '44444444-4444-4444-8444-444444444444'),
  };
  const storage = {
    getObject: vi.fn(async () => new Uint8Array([1])),
    putObject: vi.fn(async () => {}),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const ai = opts.ai ?? createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  const onGenerated = vi.fn(async () => {});
  const handler = createLookRenderHandler({
    ai,
    storage,
    styling: styling as never,
    frames: frames as never,
    ledger,
    onGenerated,
  });
  const writeStage = vi.fn(async () => {});
  const run = (input: Record<string, unknown>) =>
    handler.run({
      jobId: JOB,
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, frames, storage, ledger, generateImage, onGenerated, writeStage };
}

describe('look_render handler', () => {
  it('renders one idea frame from the stored way and lands it by index', async () => {
    const { run, frames, generateImage, onGenerated, writeStage, ledger } = setup();
    await expect(run({ target: 'idea', ideaId: IDEA, idx: 1 })).resolves.toEqual({
      status: 'succeeded',
      artifactId: IDEA,
    });
    const req = generateImage.mock.calls[0]?.[0];
    expect(req?.capability).toBe('image.secondary');
    expect(req?.prompt).toContain(fakeOutput('Camel coat').ways[1]?.title ?? '');
    expect(frames.set).toHaveBeenCalledWith(USER, IDEA, 'idea', {
      idx: 1,
      assetId: '44444444-4444-4444-8444-444444444444',
      status: 'ready',
      jobId: JOB,
    });
    expect(onGenerated).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/.+\/original$/));
    expect(writeStage).toHaveBeenNthCalledWith(1, 'text', { ideaId: IDEA });
    expect(ledger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
  });

  it('uses her piece photo as the reference when the idea came from her piece', async () => {
    const { run, storage, generateImage } = setup({
      data: ideaData({ type: 'piece', pieceId: PIECE, label: 'Camel coat' }),
    });
    await run({ target: 'idea', ideaId: IDEA, idx: 2 });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
    expect(generateImage.mock.calls[0]?.[0].references).toHaveLength(1);
  });

  it('renders a daily item as a still life, and the anchor on the hero model', async () => {
    const look = normalise(dailyFake(0), []);
    const daily = { look, weather: null, images: [] };
    const { run, generateImage, frames } = setup({ daily });
    const items = look?.steps.flatMap((s) => s.items) ?? [];
    const second = items[1];
    await run({ target: 'daily', dailyLookId: DAILY, itemIdx: second?.imageIndex ?? 1 });
    expect(generateImage.mock.calls[0]?.[0].prompt).toMatch(/^Editorial still-life/);
    expect(generateImage.mock.calls[0]?.[0].capability).toBe('image.secondary');
    expect(frames.set).toHaveBeenCalledWith(
      USER,
      DAILY,
      'daily_look',
      expect.objectContaining({ idx: second?.imageIndex, status: 'ready' }),
    );
    await run({ target: 'daily', dailyLookId: DAILY, itemIdx: 0 });
    expect(generateImage.mock.calls[1]?.[0].capability).toBe('image.hero');
    expect(generateImage.mock.calls[1]?.[0].prompt).toContain('Dublin');
  });

  it('marks the frame failed so she can ask again, and fails the job', async () => {
    const ai = createFakeProvider();
    vi.spyOn(ai, 'generateImage').mockRejectedValue(new AiError('blocked'));
    const { run, frames } = setup({ ai });
    await expect(run({ target: 'idea', ideaId: IDEA, idx: 1 })).rejects.toMatchObject({
      code: 'ai_blocked',
    });
    expect(frames.set).toHaveBeenCalledWith(
      USER,
      IDEA,
      'idea',
      expect.objectContaining({ idx: 1, status: 'failed' }),
    );
  });

  it('refuses frames that don’t exist and bad input', async () => {
    const { run, generateImage } = setup();
    await expect(run({ target: 'idea', ideaId: DAILY, idx: 1 })).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(run({ target: 'idea', ideaId: IDEA, idx: 7 })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    expect(generateImage).not.toHaveBeenCalled();
  });
});

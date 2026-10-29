import { AiError, type AiProvider, createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput, type Output } from '@robes/ai/prompts/daily';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createDailyHandler } from './daily';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '55555555-5555-4555-8555-555555555555';
const ASSET = '44444444-4444-4444-8444-444444444444';
const closet = [
  {
    id: 'coat',
    label: 'Camel coat',
    category: 'Outerwear',
    color: 'Camel',
    brand: null,
    timesWorn: 2,
    hero: true,
    seasonBand: 'autumn_winter',
  },
  {
    id: 'knit',
    label: 'Cream knit',
    category: 'Tops',
    color: 'Cream',
    brand: null,
    timesWorn: 0,
    hero: false,
    seasonBand: null,
  },
];

function setup(opts: { output?: Output; ai?: AiProvider; weather?: unknown } = {}) {
  const ai = opts.ai ?? createFakeProvider({ [FEATURE]: () => opts.output ?? fakeOutput(2) });
  const styling = {
    dailyContext: vi.fn(async () => ({
      firstName: 'Niall',
      gender: 'woman' as const,
      styleIcons: [],
      styleDna: {},
      homeCity: 'Dublin',
      homeLat: null,
      homeLon: null,
      timezone: 'Europe/Dublin',
      closet,
    })),
    createDailyLook: vi.fn(async (_user: string, _look: unknown) => LOOK),
    createGeneratedAsset: vi.fn(async () => ASSET),
    trackImage: vi.fn(async () => {}),
    mergeIdeaData: vi.fn(async () => {}),
  };
  const storage = {
    putObject: vi.fn(async (_key: string, _body: Uint8Array, _opts: unknown) => {}),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const weather = vi.fn(async () =>
    opts.weather === undefined
      ? { city: 'Dublin', month: 'September', tempRange: '11–17°C', condition: 'light rain' }
      : opts.weather,
  );
  const destination = vi.fn(async (q: { name: string }) =>
    q.name === 'Lisbon'
      ? { place: 'Lisbon, Portugal', tempRange: '15–21°C', condition: 'clear', seasonal: false }
      : null,
  );
  const writeStage = vi.fn(async (_stage: string, _output: unknown) => {});
  const handler = createDailyHandler({
    ai,
    storage,
    styling: styling as never,
    ledger,
    weather: weather as never,
    destination,
    now: () => new Date('2026-09-24T09:00:00Z'),
  });
  const run = (input: Record<string, unknown> = { prompt: 'Studio day' }) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, ai, styling, storage, ledger, weather, destination, writeStage };
}

describe('daily handler (style it for today)', () => {
  it('reads her weather, stores the normalised look, then renders only the anchor', async () => {
    const { run, styling, storage, weather, writeStage } = setup();
    await expect(run()).resolves.toEqual({ status: 'succeeded', artifactId: LOOK });
    expect(weather).toHaveBeenCalledWith({
      city: 'Dublin',
      lat: null,
      lon: null,
      date: '2026-09-24',
      month: 'September',
    });
    const saved = styling.createDailyLook.mock.calls[0]?.[1] as unknown as {
      data: {
        look: { steps: { title: string; items: { pieceId: string | null }[] }[] };
        weather: unknown;
      };
    };
    expect(saved.data.look.steps[0]?.title).toBe('The Anchor');
    expect(saved.data.look.steps[0]?.items[0]?.pieceId).toBe('coat');
    expect(saved.data.weather).toEqual({
      city: 'Dublin',
      tempRange: '11–17°C',
      condition: 'light rain',
    });
    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(storage.putObject.mock.calls[0]?.[0]).toBe(`uploads/${USER}/${ASSET}/original`);
    expect(styling.mergeIdeaData).toHaveBeenCalledWith(USER, LOOK, {
      images: [{ idx: 0, assetId: ASSET, status: 'ready' }],
    });
    expect(writeStage.mock.calls.map((c) => c[0])).toEqual(['text', 'images']);
  });

  it('dresses a place she names for its weather there, and sets the frame there', async () => {
    const { run, ai, styling, destination } = setup();
    const generateJson = vi.spyOn(ai, 'generateJson');
    await run({ prompt: 'Lunch in Lisbon' });
    expect(destination).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lisbon', date: '2026-09-24' }),
    );
    const req = generateJson.mock.calls.at(-1)?.[0];
    expect(req?.user).toContain(
      'She is dressing for Lisbon, Portugal. Forecast there: 15–21°C, clear.',
    );
    expect(req?.user).not.toContain('REAL-TIME CONTEXT');
    const saved = styling.createDailyLook.mock.calls.at(-1)?.[1] as { data: { weather: unknown } };
    expect(saved.data.weather).toEqual({
      city: 'Lisbon, Portugal',
      tempRange: '15–21°C',
      condition: 'clear',
    });
  });

  it('runs without weather', async () => {
    const { run } = setup({ weather: null });
    await expect(run({})).resolves.toMatchObject({ status: 'succeeded' });
  });

  it('fails an empty look instead of storing it', async () => {
    const empty = fakeOutput(0);
    empty.steps = [{ title: 'The Mystery', items: empty.steps[0]?.items ?? [] }];
    const { run, styling } = setup({ output: empty });
    await expect(run()).rejects.toEqual(new JobError('empty_look'));
    expect(styling.createDailyLook).not.toHaveBeenCalled();
  });

  it('keeps the look when the frame fails (partial)', async () => {
    const base = createFakeProvider({ [FEATURE]: () => fakeOutput(2) });
    const ai: AiProvider = {
      ...base,
      generateImage: vi.fn(async () => {
        throw new AiError('provider');
      }),
    };
    const { run, styling } = setup({ ai });
    await expect(run()).resolves.toEqual({ status: 'partial', artifactId: LOOK });
    expect(styling.mergeIdeaData).toHaveBeenCalledWith(USER, LOOK, {
      images: [{ idx: 0, assetId: null, status: 'failed' }],
    });
  });

  it('rejects bad input', async () => {
    const { run } = setup();
    await expect(run({ lockedPieceIds: ['not-a-uuid'] })).rejects.toEqual(
      new JobError('invalid_input'),
    );
  });
});

import { createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput, type Output } from '@robes/ai/prompts/travel';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createTravelHandler } from './travel';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const TRIP = '77777777-7777-4777-8777-777777777777';
const SHIRT = '22222222-2222-4222-8222-222222222222';
const piece = (id: string, label: string) => ({
  id,
  label,
  category: 'Tops',
  color: null,
  brand: null,
  timesWorn: 0,
  hero: false,
  seasonBand: null,
});
const closet = [
  piece(SHIRT, 'Linen shirt'),
  piece('33333333-3333-4333-8333-333333333333', 'Trousers'),
];
const input = {
  destination: 'Lisbon',
  dateFrom: '2026-10-02',
  dateTo: '2026-10-04',
  occasions: ['Beach day', 'Dinner', 'Market'],
};

function setup(outputs: Output[]) {
  const replies = [...outputs];
  const generate = vi.fn(
    (_req: { system: string }) => replies.shift() ?? (outputs.at(-1) as Output),
  );
  const ai = createFakeProvider({ [FEATURE]: generate });
  const styling = {
    dailyContext: vi.fn(async () => ({
      firstName: 'Niall',
      gender: 'woman' as const,
      styleIcons: [],
      styleDna: {},
      homeCity: null,
      homeLat: null,
      homeLon: null,
      timezone: 'Europe/Dublin',
      closet,
    })),
    createTrip: vi.fn(async (_u: string, _t: { data: Record<string, unknown> }) => TRIP),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const tripWeather = vi.fn(async () => ({
    city: 'Lisbon',
    country: 'Portugal',
    minC: 15,
    maxC: 27,
    tempRange: '15–27°C',
    condition: 'clear',
    seasonal: false,
  }));
  const writeStage = vi.fn(async () => {});
  const handler = createTravelHandler({ ai, styling: styling as never, ledger, tripWeather });
  const run = (over: Record<string, unknown> = {}) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { ...input, ...over },
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, styling, ledger, generate, writeStage, tripWeather };
}

describe('travel handler', () => {
  it('stores one look per plan laid across her dates, with weather and owned matches', async () => {
    const { run, styling, ledger, writeStage, tripWeather } = setup([
      fakeOutput(input.occasions, 2),
    ]);
    await expect(run()).resolves.toEqual({ status: 'succeeded', artifactId: TRIP });
    expect(tripWeather).toHaveBeenCalledWith({
      destination: 'Lisbon',
      dateFrom: '2026-10-02',
      dateTo: '2026-10-04',
    });
    const data = styling.createTrip.mock.calls[0]?.[1].data as {
      lookDates: string[];
      edit: { looks: { occasion: string }[]; capsule: { pieceId: string | null }[] };
      weather: { tempRange: string };
    };
    expect(data.edit.looks.map((l) => l.occasion)).toEqual(input.occasions);
    expect(data.lookDates).toEqual(['2026-10-02', '2026-10-03', '2026-10-04']);
    expect(data.edit.capsule[0]?.pieceId).toBe(SHIRT);
    expect(data.weather.tempRange).toBe('15–27°C');
    expect(ledger.record).toHaveBeenCalledTimes(1);
    expect(writeStage).toHaveBeenCalledWith('text', { tripId: TRIP });
  });

  it('regenerates once when a key piece is missing and keeps the better attempt', async () => {
    const without = fakeOutput(input.occasions, 0);
    const withShirt = fakeOutput(input.occasions, 1);
    const { run, generate, styling } = setup([without, withShirt]);
    await run({ anchorPieceIds: [SHIRT] });
    expect(generate).toHaveBeenCalledTimes(2);
    const second = generate.mock.calls[1]?.[0];
    expect(second?.system).toContain('these key pieces were missing from the capsule: Linen shirt');
    const data = styling.createTrip.mock.calls[0]?.[1].data as {
      validation: { missingKeyPieces: number };
    };
    expect(data.validation.missingKeyPieces).toBe(0);
  });

  it('ignores key pieces that are not hers', async () => {
    const { run, generate } = setup([fakeOutput(input.occasions, 0)]);
    await run({ anchorPieceIds: ['99999999-9999-4999-8999-999999999999'] });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('fails an empty edit and rejects bad input', async () => {
    const empty = { ...fakeOutput([]), capsule: [], looks: [] };
    await expect(setup([empty]).run()).rejects.toEqual(new JobError('empty_trip'));
    await expect(setup([empty]).run({ dateTo: '2026-12-31' })).rejects.toEqual(
      new JobError('invalid_input'),
    );
  });
});

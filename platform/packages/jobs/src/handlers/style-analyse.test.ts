import { createFakeProvider } from '@robes/ai';
import {
  COLOUR_FEATURE,
  fakeColour,
  fakeSilhouette,
  SILHOUETTE_FEATURE,
} from '@robes/ai/prompts/style-analyse';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createStyleAnalyseHandler } from './style-analyse';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const ASSET = '33333333-3333-4333-8333-333333333333';

function setup(opts: { photoKind?: string; statuses?: string[]; colour?: object } = {}) {
  const statuses = [...(opts.statuses ?? ['ready'])];
  const profiles = {
    photo: vi.fn(async () => ({
      id: ASSET,
      kind: opts.photoKind ?? 'headshot',
      status: statuses.length > 1 ? statuses.shift() : statuses[0],
    })),
    saveColour: vi.fn(async () => {}),
    saveSilhouette: vi.fn(async () => {}),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const storage = { getObject: vi.fn(async () => new Uint8Array([1])) };
  const ai = createFakeProvider({
    [COLOUR_FEATURE]: () => ({ ...fakeColour(), ...opts.colour }),
    [SILHOUETTE_FEATURE]: () => fakeSilhouette(),
  });
  const handler = createStyleAnalyseHandler({
    ai,
    storage,
    profiles: profiles as never,
    ledger,
    assetWaitMs: 50,
    pollMs: 5,
  });
  const writeStage = vi.fn(async () => {});
  const run = (kind: 'colour' | 'silhouette') =>
    handler.run({
      jobId: '44444444-4444-4444-8444-444444444444',
      userId: USER,
      input: { kind, assetId: ASSET },
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, profiles, ledger, writeStage, storage, generateJson: vi.spyOn(ai, 'generateJson') };
}

describe('stylenotes_analyse handler', () => {
  it('reads deliberately: the reasoning model, room to think, her photo at full detail', async () => {
    const { run, generateJson } = setup();
    await run('colour');
    expect(generateJson.mock.calls[0]?.[0]).toMatchObject({
      capability: 'text.reasoning',
      deliberate: true,
      maxOutputTokens: 8192,
    });
  });

  it('reads colouring from the headshot master and saves the composed profile', async () => {
    const { run, profiles, ledger, storage, writeStage } = setup({
      statuses: ['pending', 'ready'],
    });
    await expect(run('colour')).resolves.toEqual({ status: 'succeeded' });
    expect(storage.getObject).toHaveBeenCalledWith(`media/${USER}/${ASSET}/master.jpg`);
    expect(profiles.saveColour).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        season: 'Soft Autumn',
        undertone: 'Warm',
        assetId: ASSET,
        modelVersion: 'style.colour.v1',
        dna: expect.objectContaining({ archetype_name: 'Soft Autumn' }),
      }),
    );
    expect(ledger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    expect(writeStage).toHaveBeenCalledWith('text', {
      styleKind: 'colour',
      archetype: 'Soft Autumn',
    });
  });

  it('reads the silhouette only from a full-length photo', async () => {
    const wrongPhoto = setup({ photoKind: 'headshot' });
    await expect(wrongPhoto.run('silhouette')).rejects.toEqual(new JobError('not_found'));
    const { run, profiles } = setup({ photoKind: 'full_length' });
    await expect(run('silhouette')).resolves.toEqual({ status: 'succeeded' });
    expect(profiles.saveSilhouette).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ bodyType: 'Hourglass' }),
    );
  });

  it('saves nothing when no face is found', async () => {
    const { run, profiles, writeStage } = setup({ colour: { no_face_detected: true } });
    await expect(run('colour')).resolves.toEqual({ status: 'partial' });
    expect(profiles.saveColour).not.toHaveBeenCalled();
    expect(writeStage).toHaveBeenCalledWith('text', { styleKind: 'colour', noSubject: true });
  });

  it('gives up on a photo that never renders', async () => {
    const { run } = setup({ statuses: ['pending'] });
    await expect(run('colour')).rejects.toEqual(new JobError('unreadable_photo'));
  });
});

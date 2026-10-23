import { AiError, createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput } from '@robes/ai/prompts/style-brief';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createStyleBriefHandler } from './style-brief';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');

function setup(
  opts: {
    fail?: AiError[];
    kept?: string[];
    struck?: string[];
    notes?: string;
    overrides?: object;
    palette?: object;
  } = {},
) {
  const fails = [...(opts.fail ?? [])];
  const fake = createFakeProvider({ [FEATURE]: () => fakeOutput() });
  const calls: string[] = [];
  const ai = {
    ...fake,
    generateJson: vi.fn(async (req: Parameters<typeof fake.generateJson>[0]) => {
      calls.push(req.user);
      const err = fails.shift();
      if (err) throw err;
      return fake.generateJson(req);
    }),
  } as typeof fake;
  const brief = {
    evidence: vi.fn(async () => ({
      firstName: 'Ann',
      gender: 'woman' as const,
      styleIcons: [],
      wardrobe: [1, 2, 3, 4].map((i) => ({
        label: `Piece ${i}`,
        category: 'Tops',
        color: 'navy',
        brand: null,
        notes: null,
        sentiment: null,
        fitConfidence: null,
        hero: false,
        timesWorn: i,
        fit: [],
      })),
      looks: [{ name: 'Office armour', pieces: ['Piece 1'], wears: 2 }],
      memory: [],
      kept: (opts.kept ?? []).map((text) => ({ list: 'loves', state: 'kept', text })),
      struck: opts.struck ?? [],
      pending: [],
    })),
    saveRead: vi.fn(async (_u: unknown, drafts: unknown[]) => drafts.length),
  };
  const styling = {
    context: vi.fn(async () => ({
      styleDna: {
        brief: { loves: opts.kept ?? [], avoids: [], rules: [], notes: opts.notes ?? '' },
        user_overrides: opts.overrides ?? {},
        palette: opts.palette ?? {},
      },
    })),
  };
  const ledger = { record: vi.fn(async () => {}) };
  const handler = createStyleBriefHandler({
    ai,
    brief: brief as never,
    styling: styling as never,
    ledger,
  });
  const writeStage = vi.fn(async () => {});
  const run = (input: Record<string, unknown> = {}) =>
    handler.run({
      jobId: '44444444-4444-4444-8444-444444444444',
      userId: USER,
      input,
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  return { run, brief, ledger, writeStage, calls };
}

describe('style_brief handler', () => {
  it('lands what Robes noticed as waiting lines, with the paragraph and colours as sentences', async () => {
    const { run, brief, writeStage } = setup({ kept: ['You reach for a defined waist'] });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    const drafts = brief.saveRead.mock.calls[0]?.[1];
    expect(drafts).toEqual([
      {
        list: 'loves',
        text: 'One thing that disrupts the line',
        because: 'a sharp shoe or bag on every look',
      },
      {
        list: 'avoids',
        text: 'Anything that reads polite',
        because: 'the twinsets you never wear',
      },
      {
        list: 'rules',
        text: 'Loafers only with a cropped trouser',
        because: 'the looks you wear most',
      },
      {
        list: 'notes',
        text: 'You dress well when the structure is already there.',
        fullText: expect.stringMatching(/^You dress well when the structure is already there\. A/),
        because: 'From 4 pieces and 1 look',
      },
      {
        list: 'colours',
        text: 'You reach for navy and cream. Mustard stays on the rail.',
        because: 'From 4 pieces and 1 look',
        loved: ['navy', 'cream'],
        rejected: ['mustard'],
      },
    ]);
    expect(writeStage).toHaveBeenCalledWith('text', { lines: 5, thin: false });
  });

  it('never offers a struck line, a paragraph she has or a colour she filed', async () => {
    const { run, brief } = setup({
      struck: ['anything that reads polite'],
      notes: 'Hers already.',
      overrides: { loved_colors: ['Navy', 'Cream'], rejected_colors: ['mustard'] },
    });
    await run();
    const drafts = brief.saveRead.mock.calls[0]?.[1] as { list: string }[];
    expect(drafts.map((d) => d.list)).toEqual(['loves', 'loves', 'rules']);
  });

  it('reads her palette: a colour it already says is not offered again', async () => {
    const { run, brief } = setup({
      palette: { fam: { blues: 1, whites: 1 }, shade: { mustard: -1 } },
    });
    await run();
    const drafts = brief.saveRead.mock.calls[0]?.[1] as { list: string }[];
    expect(drafts.map((d) => d.list)).not.toContain('colours');
  });

  it('retries a cut answer once on the compact evidence set', async () => {
    const { run, calls, ledger } = setup({ fail: [new AiError('invalid_output')] });
    await expect(run()).resolves.toEqual({ status: 'succeeded' });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('her heroes and most-worn');
    expect(ledger.record).toHaveBeenCalledTimes(1);
  });

  it('fails with a short code when the retry fails too, and rejects any input', async () => {
    const failing = setup({ fail: [new AiError('timeout'), new AiError('provider')] });
    await expect(failing.run()).rejects.toEqual(new JobError('ai_provider'));
    expect(failing.brief.saveRead).not.toHaveBeenCalled();
    const blocked = setup({ fail: [new AiError('blocked')] });
    await expect(blocked.run()).rejects.toEqual(new JobError('ai_blocked'));
    await expect(setup().run({ userId: 'someone-else' })).rejects.toEqual(
      new JobError('invalid_input'),
    );
  });
});

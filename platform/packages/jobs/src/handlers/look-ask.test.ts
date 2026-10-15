import { createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput } from '@robes/ai/prompts/look-ask';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createLookAskHandler } from './look-ask';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const LOOK = '77777777-7777-4777-8777-777777777777';
const TROUSER = '22222222-2222-4222-8222-222222222222';
const JEAN = '33333333-3333-4333-8333-333333333333';
const NOT_HERS = '44444444-4444-4444-8444-444444444444';

function setup() {
  const ai = createFakeProvider({ [FEATURE]: (req) => fakeOutput(req.system, req.user) });
  const generateJson = vi.spyOn(ai, 'generateJson');
  const noticed = { add: vi.fn(async () => true) };
  const ledger = { record: vi.fn(async () => {}) };
  const closet = [
    {
      id: TROUSER,
      label: 'White wide-leg trouser',
      category: 'Bottoms',
      color: 'white',
      brand: null,
      timesWorn: 0,
    },
    {
      id: JEAN,
      label: 'Dark straight jean',
      category: 'Bottoms',
      color: 'indigo',
      brand: 'Agolde',
      timesWorn: 3,
    },
  ];
  const handler = createLookAskHandler({
    ai,
    styling: {
      context: vi.fn(async () => ({
        gender: 'woman',
        styleDna: {},
        styleIcons: [],
        closet,
        firstName: null,
        wardrobeCount: 2,
      })),
    } as never,
    suggested: {
      look: vi.fn(async (_u: string, id: string) =>
        id === LOOK ? { look: { name: 'Harbour dinner' }, pieces: [], siblings: [] } : undefined,
      ),
    } as never,
    noticed,
    ledger,
  });
  const writeStage = vi.fn(async () => {});
  const run = (text: string, extra: Record<string, unknown> = {}) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: {
        lookId: LOOK,
        surface: 'draft',
        text,
        rack: [
          { key: TROUSER, pieceId: TROUSER, proposal: null, styled: 'cuffed once' },
          { key: NOT_HERS, pieceId: NOT_HERS, proposal: null },
          {
            key: 'p-aaaa1111',
            pieceId: null,
            proposal: { name: 'Black mules', category: 'Shoes', brand: 'Toteme' },
            was: 'Tan loafers',
          },
        ],
        ...extra,
      },
      signal: new AbortController().signal,
      writeStage,
      isCancelled: async () => false,
    });
  const answer = () =>
    (writeStage.mock.calls.at(-1) as unknown as [string, { ask: unknown }])[1].ask;
  return { run, answer, generateJson, noticed, ledger };
}

describe('look_ask handler (the look prompt)', () => {
  it('names her rack from her wardrobe and resolves a swap to her piece by key', async () => {
    const { run, answer, generateJson, ledger } = setup();
    await expect(run('swap the trouser for the dark straight jean')).resolves.toEqual({
      status: 'succeeded',
    });
    const system = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(system).toContain('[0] White wide-leg trouser [Bottoms] (hers) — worn: cuffed once');
    expect(system).toContain(
      '[1] Black mules [Shoes] (a piece Robes proposed, not hers yet) — just changed; was: Tan loafers',
    );
    expect(system).not.toContain(NOT_HERS);
    // The pool is her wardrobe minus what is on the look.
    expect(system).toContain('[0] Dark straight jean [Bottoms], indigo, Agolde');
    expect(answer()).toMatchObject({
      intent: 'swap',
      swaps: [{ key: TROUSER, to: { pieceId: JEAN, name: 'Dark straight jean', brand: 'Agolde' } }],
      noticed: false,
    });
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'looks.ask', status: 'ok' }),
    );
  });

  it('a rule waits as a Robes-noticed line, never changing the look', async () => {
    const { run, answer, noticed } = setup();
    await run("I don't wear double denim");
    expect(answer()).toMatchObject({
      intent: 'rule',
      rule: 'No double denim',
      swaps: [],
      noticed: true,
    });
    expect(noticed.add).toHaveBeenCalledWith(USER, {
      text: 'No double denim',
      because: 'You said it on “Harbour dinner”',
      lookId: LOOK,
    });
  });

  it('puts every changed row back when none is named, and drafts a vague ask', async () => {
    const { run, answer } = setup();
    await run('put it back');
    expect(answer()).toMatchObject({ intent: 'back', back: [], backAll: true });
    await run('too dressy');
    expect(answer()).toMatchObject({ intent: 'draft', swaps: [] });
    expect((answer() as { draft: string }).draft).toMatch(/^Change the white wide-leg trouser/);
  });

  it('refuses a look that isn’t hers and bad input', async () => {
    const { run } = setup();
    await expect(run('hi', { lookId: TROUSER })).rejects.toMatchObject({ code: 'not_found' });
    await expect(run('')).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

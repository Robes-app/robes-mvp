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
const CAMI = '55555555-5555-4555-8555-555555555555';

function setup() {
  const ai = createFakeProvider({ [FEATURE]: (req) => fakeOutput(req.system, req.user) });
  const generateJson = vi.spyOn(ai, 'generateJson');
  const lookPrompt = { notice: vi.fn(async () => true), remember: vi.fn(async () => {}) };
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
      categoryL2: 'Jeans',
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
        wishes: [
          {
            id: CAMI,
            label: 'Silk cami',
            category: 'Tops',
            color: 'coral',
            brand: 'Vince',
            sourceLabel: 'vince.com',
            price: 89,
            currency: 'EUR',
          },
        ],
        firstName: null,
        wardrobeCount: 2,
      })),
    } as never,
    suggested: {
      look: vi.fn(async (_u: string, id: string) =>
        id === LOOK ? { look: { name: 'Harbour dinner' }, pieces: [], siblings: [] } : undefined,
      ),
    } as never,
    lookPrompt,
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
  return { run, answer, generateJson, lookPrompt, ledger };
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
      // The swap names the piece's subcategory, so the rack's eyebrow reads the sheet.
      swaps: [
        {
          key: TROUSER,
          to: { pieceId: JEAN, name: 'Dark straight jean', categoryL2: 'Jeans', brand: 'Agolde' },
        },
      ],
      noticed: false,
    });
    expect(ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'looks.ask', status: 'ok' }),
    );
  });

  it('a rule waits as a Robes-noticed line, never changing the look', async () => {
    const { run, answer, lookPrompt } = setup();
    await run("I don't wear double denim");
    expect(answer()).toMatchObject({
      intent: 'rule',
      rule: 'No double denim',
      swaps: [],
      noticed: true,
    });
    expect(lookPrompt.notice).toHaveBeenCalledWith(USER, {
      list: 'rules',
      text: 'No double denim',
      because: 'You said it on “Harbour dinner”',
      origin: 'prompt',
    });
    // Every line lands in her memory as an ask about this look.
    expect(lookPrompt.remember).toHaveBeenCalledWith(USER, {
      kind: 'ask',
      surface: 'draft',
      subject: 'Harbour dinner',
      body: "I don't wear double denim",
      lookId: LOOK,
    });
  });

  it('a note about the whole picture comes back as a picture note, the look unchanged', async () => {
    const { run, answer, lookPrompt } = setup();
    await run('a different pose, walking');
    expect(answer()).toMatchObject({
      intent: 'picture',
      picture: 'a different pose, walking',
      reply: '',
      swaps: [],
      adds: [],
      styled: [],
      noticed: false,
    });
    expect(lookPrompt.notice).not.toHaveBeenCalled();
  });

  it('puts every changed row back when none is named, and drafts a vague ask', async () => {
    const { run, answer } = setup();
    await run('put it back');
    expect(answer()).toMatchObject({ intent: 'back', back: [], backAll: true });
    await run('too dressy');
    expect(answer()).toMatchObject({ intent: 'draft', swaps: [] });
    expect((answer() as { draft: string }).draft).toMatch(/^Change the white wide-leg trouser/);
  });

  it('Shop off keeps the answer to her wardrobe; Shop on reaches for her wishlist', async () => {
    const { run, answer, generateJson } = setup();
    // Off: no wishlist in the pool, and a new piece Robes would invent is dropped.
    await run('swap the trouser for a red skirt', { balance: 'owned' });
    const off = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(off).toContain('Shop is OFF');
    expect(off).not.toContain('Silk cami');
    expect(answer()).toMatchObject({ intent: 'swap', swaps: [] });
    // On: her wishes follow her wardrobe in the pool, marked; a swap to one is that wish.
    await run('swap the trouser for the silk cami', { balance: 'mix' });
    const on = generateJson.mock.calls[1]?.[0].system ?? '';
    expect(on).toContain('[1] Silk cami [Tops], coral, Vince (on her wishlist, not hers yet)');
    expect(answer()).toMatchObject({
      intent: 'swap',
      swaps: [
        {
          key: TROUSER,
          to: {
            proposal: {
              name: 'Silk cami',
              category: 'Tops',
              brand: 'Vince',
              retailerHint: 'vince.com',
              pricePoint: '€89',
              wishlisted: true,
              wishlistItemId: CAMI,
            },
          },
        },
      ],
    });
    // Shop alone (`new`): her wishes are offered, nothing she owns is.
    await run('swap the trouser for the silk cami', { balance: 'new' });
    const alone = generateJson.mock.calls[2]?.[0].system ?? '';
    expect(alone).toContain('Silk cami [Tops], coral, Vince (on her wishlist, not hers yet)');
    expect(alone).not.toContain('Dark straight jean');
    // Unset (an older client): the wardrobe-first pool, as before.
    await run('swap the trouser for a red skirt');
    expect(generateJson.mock.calls[3]?.[0].system).not.toContain('Silk cami');
    expect(answer()).toMatchObject({ swaps: [{ key: TROUSER, to: { proposal: {} } }] });
  });

  // "Add high heels" on a look with no heels (testing, 14 Nov): the piece lands as a new row —
  // one she owns by its id, a wish with its identity, a new one with brand, retailer and price.
  it('adds a piece to the look as a new row, from her wardrobe, her wishlist or new', async () => {
    const { run, answer, generateJson } = setup();
    const blank = { name: '', brand: '', retailer_hint: '', price_point: '', category: '' };
    generateJson.mockResolvedValueOnce({
      data: {
        intent: 'swap',
        reply: '',
        swaps: [],
        back: [],
        styled: [],
        draft: '',
        rule: '',
        follow_up: 'Do the heels work?',
        adds: [
          { pool_index: 0, ...blank },
          { pool_index: 1, ...blank },
          {
            pool_index: -1,
            name: 'Black slingback heels',
            brand: 'Aeyde',
            retailer_hint: 'aeyde.com',
            price_point: '€295',
            category: 'Shoes',
          },
        ],
      },
      usage: {},
    } as never);
    await run('add high heels', { balance: 'mix' });
    const system = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(system).toContain('put it in "adds"');
    expect(answer()).toMatchObject({
      intent: 'swap',
      swaps: [],
      followUp: 'Do the heels work?',
      adds: [
        { pieceId: JEAN, name: 'Dark straight jean', category: 'Bottoms', categoryL2: 'Jeans' },
        {
          proposal: {
            name: 'Silk cami',
            wishlisted: true,
            wishlistItemId: CAMI,
            pricePoint: '€89',
          },
        },
        {
          proposal: {
            name: 'Black slingback heels',
            brand: 'Aeyde',
            retailerHint: 'aeyde.com',
            pricePoint: '€295',
          },
        },
      ],
    });
  });

  it('refuses a look that isn’t hers and bad input', async () => {
    const { run } = setup();
    await expect(run('hi', { lookId: TROUSER })).rejects.toMatchObject({ code: 'not_found' });
    await expect(run('')).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('a tapped reason is a clear instruction: the look changes, a question follows, memory keeps it', async () => {
    const { run, answer, generateJson, lookPrompt } = setup();
    // No words: the reasons alone are the ask (look prompt PRD F10, F11).
    await run('', { reasons: ['dressy', 'colours'] });
    const system = generateJson.mock.calls[0]?.[0].system ?? '';
    expect(system).toContain(
      'SHE TAPPED WHAT IS NOT RIGHT WITH THIS LOOK: it is too dressy; the colours are not right.',
    );
    expect(generateJson.mock.calls[0]?.[0].user).toContain('She typed nothing');
    const result = answer() as { intent: string; swaps: unknown[]; followUp?: string };
    expect(result.intent).toBe('swap');
    expect(result.swaps).toHaveLength(1);
    expect(result.followUp).toBe('How does the change look?');
    expect(lookPrompt.remember).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({ body: 'it is too dressy · the colours are not right' }),
    );
    // With her words, both ride into memory, the reasons first.
    await run('nothing black', { reasons: ['colours'] });
    expect(lookPrompt.remember).toHaveBeenLastCalledWith(
      USER,
      expect.objectContaining({ body: 'the colours are not right · nothing black' }),
    );
  });

  it('refuses an ask that says nothing: no words and no reason', async () => {
    const { run } = setup();
    await expect(run('')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(run('', { reasons: [] })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

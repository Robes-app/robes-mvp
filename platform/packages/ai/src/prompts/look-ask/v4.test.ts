import { describe, expect, it } from 'vitest';
import * as v3 from './v3';
import { type AskContext, buildSystem, normaliseAnswer, Output, REPLACED, VERSION } from './v4';

const ctx: AskContext = {
  gender: 'woman',
  styleDna: {},
  styleIcons: [],
  pool: {
    kind: 'wardrobe',
    items: [
      { label: 'Taupe mesh ballet flats', category: 'Shoes', color: 'taupe', brand: null },
      { label: 'Black tailored wool trousers', category: 'Bottoms', color: 'black', brand: null },
    ],
  },
  rack: [
    {
      name: 'Dark wash barrel leg jeans',
      category: 'Bottoms',
      owned: true,
      keep: false,
      was: null,
      styled: null,
    },
  ],
  context: {},
  thread: [],
};
const out = (over: Partial<Output>): Output =>
  Output.parse({
    intent: 'swap',
    reply: '',
    swaps: [],
    back: [],
    styled: [],
    draft: '',
    rule: '',
    follow_up: 'Do the heels work?',
    ...over,
  });
const heels = {
  pool_index: -1,
  name: 'Black slingback heels',
  brand: 'Aeyde',
  retailer_hint: 'aeyde.com',
  price_point: '€295',
  category: 'Shoes',
};

describe('look-ask v4', () => {
  it('is version 4', () => {
    expect(VERSION).toBe(4);
  });

  it('adds a piece as a new row, and never asks for a slot or drafts the add', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('put it in "adds" — a NEW row on the look');
    expect(system).not.toContain('would need a slot');
    expect(system).toContain('Never refuse an add for want of a slot');
  });

  it('makes a vague change instead of describing it', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('MAKE the change, never describe it');
    expect(system).not.toContain('NOTHING changes. Decide which pieces');
  });

  it('keeps "from my wardrobe" to pieces she owns, and reads the look, not the thread', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('FROM HER WARDROBE');
    expect(system).toContain('is NOT on the look');
  });

  it('replaces sentences v3 still carries', () => {
    const before = v3.buildSystem(ctx);
    for (const sentence of REPLACED) expect(before).toContain(sentence);
  });

  it('with Shop on, a new piece is added with its brand, retailer and price', () => {
    const answer = normaliseAnswer(out({ adds: [heels] }), ctx);
    expect(answer.swaps).toEqual([]);
    expect(answer.adds).toEqual([
      {
        proposal: {
          name: 'Black slingback heels',
          category: 'Shoes',
          brand: 'Aeyde',
          retailerHint: 'aeyde.com',
          pricePoint: '€295',
        },
      },
    ]);
    expect(answer.followUp).toBe('Do the heels work?');
  });

  it('files an added coat as outerwear when its category is not one of ours (19 Nov)', () => {
    const coat = { ...heels, name: 'Oversized wool-blend coat', brand: 'COS', category: 'Coats' };
    const [add] = normaliseAnswer(out({ adds: [coat] }), ctx).adds;
    expect(add && 'proposal' in add ? add.proposal.category : null).toBe('Outerwear');
    const odd = { ...coat, category: 'Warm layer' };
    const [again] = normaliseAnswer(out({ adds: [odd] }), ctx).adds;
    expect(again && 'proposal' in again ? again.proposal.category : null).toBe('Outerwear');
  });

  it('adds a piece she owns by its pool index, once', () => {
    const flats = { ...heels, pool_index: 0, name: '' };
    expect(normaliseAnswer(out({ adds: [flats, flats] }), ctx).adds).toEqual([{ poolIndex: 0 }]);
  });

  it('with Shop off, never adds a new piece', () => {
    const owned = { ...ctx, pool: { ...ctx.pool, kind: 'owned' as const } };
    expect(normaliseAnswer(out({ adds: [heels] }), owned).adds).toEqual([]);
  });

  it('adds nothing unless the answer is a change', () => {
    expect(normaliseAnswer(out({ intent: 'clarify', adds: [heels] }), ctx).adds).toEqual([]);
  });

  it('reads an answer from before adds existed', () => {
    const old = Output.parse({
      intent: 'none',
      reply: 'x',
      swaps: [],
      back: [],
      styled: [],
      draft: '',
      rule: '',
    });
    expect(old.adds).toEqual([]);
  });
});

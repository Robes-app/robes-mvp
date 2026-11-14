import { describe, expect, it } from 'vitest';
import * as v1 from './v1';
import {
  type AskContext,
  buildSystem,
  buildUser,
  fakeOutput,
  normaliseAnswer,
  Output,
  VERSION,
} from './v2';

const ctx: AskContext = {
  gender: 'woman',
  styleDna: {},
  styleIcons: [],
  pool: {
    kind: 'wardrobe',
    items: [
      { label: 'Dark straight jean', category: 'Bottoms', color: 'indigo', brand: null },
      { label: 'Grey merino', category: 'Tops', color: 'grey', brand: 'COS' },
    ],
  },
  rack: [
    {
      name: 'White wide-leg trouser',
      category: 'Bottoms',
      owned: true,
      keep: false,
      was: null,
      styled: null,
    },
    { name: 'Camel coat', category: 'Outerwear', owned: true, keep: true, was: null, styled: null },
  ],
  context: { weather: '9–13° in Dublin' },
  thread: [],
};
const user = (text: string) =>
  buildUser({ name: 'Harbour dinner', surface: 'draft', text, thread: [] });

describe('look-ask v2 — the reasons she taps, and the follow-up question', () => {
  it('is version 2, and v1 word for word before its own paragraphs', () => {
    expect(VERSION).toBe(2);
    const system = buildSystem(ctx);
    expect(system.startsWith(v1.buildSystem(ctx))).toBe(true);
    expect(system).toContain('FOLLOW-UP: when the look changed');
    expect(system).not.toContain('SHE TAPPED WHAT IS NOT RIGHT');
  });

  it('reads up to three reasons as a clear instruction that keeps the rest', () => {
    const system = buildSystem({ ...ctx, reasons: ['dressy', 'colours', 'weather', 'fit'] });
    expect(system).toContain(
      'SHE TAPPED WHAT IS NOT RIGHT WITH THIS LOOK: it is too dressy; the colours are not right; it is not right for the weather.',
    );
    expect(system).not.toContain('the fit or the shape');
    expect(system).toContain('never answer it with a "draft"');
    expect(system).toContain('KEEP every other row exactly as it is');
    expect(system).toContain('For the weather: read the weather in CONTEXT.');
    // "A piece I don't like" with no piece named asks which, rather than guess (F15).
    expect(buildSystem({ ...ctx, reasons: ['piece'] })).toContain(
      'if they name none, intent "clarify" and ask which piece',
    );
  });

  it('fences her words as v1 does, and says so when she typed none', () => {
    expect(user('lose the scarf')).toBe(
      v1.buildUser({
        name: 'Harbour dinner',
        surface: 'draft',
        text: 'lose the scarf',
        thread: [],
      }),
    );
    const none = user('  ');
    expect(none).toContain('The look is "Harbour dinner"');
    expect(none.endsWith('She typed nothing: read what she tapped.')).toBe(true);
    expect(none).not.toContain('<user_input>');
  });

  it('keeps the follow-up only when the look changed, without quotation marks', () => {
    const base = { back: [], styled: [], draft: '', rule: '' };
    const swapped = normaliseAnswer(
      Output.parse({
        ...base,
        intent: 'swap',
        reply: 'Done.',
        swaps: [
          {
            i: 0,
            pool_index: 0,
            name: '',
            brand: '',
            retailer_hint: '',
            price_point: '',
            category: 'Bottoms',
          },
        ],
        follow_up: '“How do the  jeans look?”',
      }),
      ctx,
    );
    expect(swapped.followUp).toBe('How do the jeans look?');
    const draft = normaliseAnswer(
      Output.parse({
        ...base,
        intent: 'draft',
        reply: 'Robes would change one piece.',
        swaps: [],
        draft: 'Change the trouser for the jean',
        follow_up: 'Better?',
      }),
      ctx,
    );
    expect(draft.followUp).toBe('');
    // An older answer without the field still parses.
    expect(Output.parse({ ...base, intent: 'none', reply: '', swaps: [] }).follow_up).toBe('');
  });

  it('the offline fixture changes one row for a tapped reason and never a KEEP row', () => {
    const out = fakeOutput(buildSystem({ ...ctx, reasons: ['dressy'] }), user(''));
    expect(out.intent).toBe('swap');
    expect(out.swaps).toHaveLength(1);
    expect(out.swaps[0]).toMatchObject({ i: 0, pool_index: 0 });
    expect(out.follow_up).not.toBe('');
    // Without a reason it is v1's reading of her words.
    expect(fakeOutput(buildSystem(ctx), user('too dressy')).intent).toBe('draft');
  });
});

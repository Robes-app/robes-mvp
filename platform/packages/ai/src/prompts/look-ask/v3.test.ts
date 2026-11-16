import { describe, expect, it } from 'vitest';
import * as v2 from './v2';
import { type AskContext, buildSystem, REPLACED, VERSION } from './v3';

const ctx: AskContext = {
  gender: 'woman',
  styleDna: {},
  styleIcons: [],
  pool: {
    kind: 'wardrobe',
    items: [{ label: 'Dark straight jean', category: 'Bottoms', color: 'indigo', brand: null }],
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
  ],
  context: {},
  thread: [],
};

describe('look-ask v3', () => {
  it('is version 3', () => {
    expect(VERSION).toBe(3);
  });

  it('has Robes speak to her directly, never of itself in the third person', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('speaking to her directly');
    expect(system).toContain('"your black pointed flats"');
    expect(system).not.toContain('in the third person ("Robes would change both")');
  });

  it('no longer opens an applied change with "Done."', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('Never open with "Done."');
    expect(system).not.toContain('Lead an applied change with "Done."');
  });

  it('replaces sentences v2 still carries, and leaves the rest of v2 as it is', () => {
    const before = v2.buildSystem(ctx);
    for (const sentence of REPLACED) expect(before).toContain(sentence);
    const after = buildSystem({ ...ctx, reasons: ['fit'] });
    expect(after).toContain('SHE TAPPED WHAT IS NOT RIGHT WITH THIS LOOK');
    expect(after).toContain('FOLLOW-UP:');
  });
});

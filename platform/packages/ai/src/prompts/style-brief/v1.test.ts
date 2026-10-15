import { describe, expect, it } from 'vitest';
import {
  type BriefContext,
  buildSystem,
  buildUser,
  FEATURE,
  fakeOutput,
  isThin,
  memoryLine,
  normalise,
  Output,
  VERSION,
} from './v1';

const piece = (label: string, timesWorn = 0, hero = false) => ({
  label,
  category: 'Tops',
  color: 'navy',
  brand: 'COS',
  notes: null,
  sentiment: null,
  fitConfidence: null,
  hero,
  timesWorn,
  fit: ['fitted'],
});

const ctx = (over: Partial<BriefContext> = {}): BriefContext => ({
  firstName: 'Ann',
  gender: 'woman',
  styleDna: { style_archetypes: ['Minimal'], brief: { loves: ['A defined waist'] } },
  styleIcons: ['Hailey Bieber'],
  wardrobe: [piece('Navy knit', 6, true), piece('Cream shirt'), piece('Wide trousers', 2)],
  looks: [{ name: 'Office armour', pieces: ['Navy knit', 'Wide trousers'], wears: 3 }],
  memory: [
    {
      kind: 'verdict',
      at: new Date('2026-09-28T10:00:00Z'),
      subject: 'Harbour Dinner',
      body: 'too safe',
      verdict: 0,
      pieceOut: null,
      pieceIn: null,
    },
  ],
  current: ['A defined waist'],
  ...over,
});

describe('style.brief v1', () => {
  it('is the legacy brief prompt, her brief and DNA block appended', () => {
    expect(FEATURE).toBe('style.brief');
    expect(VERSION).toBe(1);
    const system = buildSystem(ctx());
    expect(system).toMatch(/^You are Robes' head stylist, and an editor with nothing to sell\./);
    expect(system).toContain('The user is a woman (from her profile)');
    expect(system).toContain('drafting Ann’s PERSONAL STYLE BRIEF');
    expect(system).toContain('THE LENSES');
    expect(system).toContain('BANNED CONSTRUCTIONS');
    expect(system).toContain('HER STYLE BRIEF — in her own words.');
    expect(system).toContain('STYLE ICONS');
  });

  it('lays out her wardrobe, looks, memory and the never-repeat list', () => {
    const user = buildUser(ctx());
    expect(user).toContain('HER WARDROBE (3 pieces):');
    expect(user).toContain('- Navy knit (Tops, navy, COS, fitted, worn 6×, HERO)');
    expect(user).toContain('- Cream shirt (Tops, navy, COS, fitted, never worn)');
    expect(user).toContain('- "Office armour": Navy knit, Wide trousers — worn 3×');
    expect(user).toContain('- 2026-09-28 · rated "Harbour Dinner" not quite: "too safe"');
    expect(user).toContain('ALREADY IN HER BRIEF (never repeat these):\n- A defined waist');
    expect(user).not.toContain('EVIDENCE IS THIN');
  });

  it('says when the evidence is thin, and retries on her heroes and most-worn', () => {
    const thin = ctx({ wardrobe: [piece('Navy knit')], looks: [], memory: [] });
    expect(isThin(thin)).toBe(true);
    expect(buildUser(thin)).toMatch(/^EVIDENCE IS THIN/);
    const many = ctx({
      wardrobe: Array.from({ length: 50 }, (_, i) => piece(`Piece ${i}`, i % 7, i === 3)),
    });
    const compact = buildUser(many, true);
    expect(compact).toContain('HER WARDROBE (36 of 50 pieces — her heroes and most-worn):');
    expect(compact.indexOf('- Piece 3 ')).toBeLessThan(compact.indexOf('- Piece 6 '));
    expect(compact).toContain('keep every "because" short');
  });

  it('reads memory entries the way the legacy chapter did', () => {
    const at = new Date('2026-09-27T00:00:00Z');
    const base = { at, subject: null, body: null, verdict: null, pieceOut: null, pieceIn: null };
    expect(memoryLine({ ...base, kind: 'swap', pieceOut: 'Tan loafers', pieceIn: 'flats' })).toBe(
      '2026-09-27 · swapped out Tan loafers for her flats',
    );
    expect(memoryLine({ ...base, kind: 'wear', subject: 'The Thursday one' })).toBe(
      '2026-09-27 · wore "The Thursday one"',
    );
    expect(memoryLine({ ...base, kind: 'strike', body: 'you avoid colour' })).toBe(
      '2026-09-27 · struck a line Robes drafted: you avoid colour',
    );
  });

  it('returns only new lines, clamped like legacy', () => {
    const out = Output.parse({
      ...fakeOutput(),
      loves: [
        { text: 'A defined waist', because: 'x' },
        { text: '  One  thing\\u00e9  ', because: 'because' },
        { text: 'one thingé', because: 'dup' },
      ],
      colours: {
        loved: ['navy', 'cream', 'black', 'white', 'red'],
        rejected: ['a', 'b', 'c', 'd'],
      },
    });
    const n = normalise(out, ['a defined waist']);
    expect(n.loves).toEqual([{ text: 'One thingé', because: 'because' }]);
    expect(n.colours.loved).toHaveLength(4);
    expect(n.colours.rejected).toHaveLength(3);
    expect(Output.safeParse(fakeOutput()).success).toBe(true);
  });
});

describe('style.brief v1 sentences', () => {
  it('never slices a line mid-word, and keeps the paragraph’s first sentence', async () => {
    const { cutWords, firstSentence } = await import('./v1');
    expect(cutWords('short', 160)).toBe('short');
    expect(cutWords('One two three four five six', 12)).toBe('One two');
    expect(firstSentence('You dress well. Structure first.')).toBe('You dress well.');
    expect(firstSentence('No full stop here')).toBe('No full stop here');
  });
});

import { describe, expect, it } from 'vitest';
import { paletteLines } from '../style-dna/palette';
import {
  COLOUR_FAMILIES,
  cleanPalette,
  colourPreference,
  colourPromptBlock,
  familyShadeIds,
  LEGACY_COLOURS,
  matchFamily,
  PATTERNS,
  paletteFromWords,
  paletteTally,
  pickShade,
  resolveShade,
  SHADE_IDS,
  SHADES,
  setPreference,
  shade,
  shadeByName,
  shadePreference,
} from './index';

describe('colour model', () => {
  it('has 13 families, 74 shades each in one family, and 13 patterns', () => {
    expect(COLOUR_FAMILIES).toHaveLength(13);
    expect(SHADES).toHaveLength(74);
    expect(new Set(SHADE_IDS).size).toBe(74);
    expect(PATTERNS).toHaveLength(13);
    for (const f of COLOUR_FAMILIES) {
      expect(f.tile).toHaveLength(4);
      for (const s of f.tile) expect(s.family).toBe(f.id);
    }
  });

  it('maps every retired wheel name to a shade', () => {
    for (const id of Object.values(LEGACY_COLOURS)) expect(shade(id)).not.toBeNull();
    expect(shadeByName('Black')?.id).toBe('jet');
    expect(shadeByName('vermillion')?.id).toBe('scarlet');
    expect(shadeByName('Soft black')?.id).toBe('softblack');
    expect(shadeByName('Print')).toBeNull();
  });

  it('resolves an id, then a name, then the nearest shade to a hex', () => {
    expect(resolveShade({ id: 'NAVY' })?.id).toBe('navy');
    expect(resolveShade({ id: 'nope', name: 'Camel' })?.id).toBe('camel');
    expect(resolveShade({ hex: '#1F2A45' })?.id).toBe('navy');
    expect(resolveShade({ hex: '#C9A24A' })?.metallic).toBe(false);
    expect(resolveShade({})).toBeNull();
  });

  it('reads preference words as a family or a shade', () => {
    expect(colourPreference('Blues')).toEqual({ family: 'blues' });
    expect(colourPreference('grey')).toEqual({ family: 'greys' });
    expect(colourPreference('Cobalt')).toEqual({ shade: 'cobalt' });
    expect(colourPreference('sparkly')).toBeNull();
  });

  it('lists every shade and pattern id in the prompt block', () => {
    const block = colourPromptBlock();
    for (const id of SHADE_IDS) expect(block).toContain(`${id} (`);
    expect(block).toContain('plain (no print)');
  });

  it('matches a family filter to its shades', () => {
    expect(familyShadeIds('blues')).toContain('cobalt');
    expect(familyShadeIds('nope')).toEqual([]);
  });
});

describe('palette', () => {
  it('cleans a stored palette: unknown ids, no-view and non-preference prints drop', () => {
    expect(
      cleanPalette({
        fam: { blues: 1, nope: 1, reds: 0 },
        shade: { cobalt: -1, x: -1, navy: 0, sky: 'no' },
        print: { stripes: '1', camo: 1 },
      }),
    ).toEqual({ fam: { blues: 1 }, shade: { cobalt: -1, navy: 0 }, print: { stripes: 1 } });
    expect(cleanPalette('junk')).toEqual({ fam: {}, shade: {}, print: {} });
  });

  it('a shade she set overrides its family', () => {
    const p = cleanPalette({ fam: { blues: 1 }, shade: { cobalt: -1 } });
    expect(shadePreference(p, 'navy')).toBe(1);
    expect(shadePreference(p, 'cobalt')).toBe(-1);
    expect(shadePreference(p, 'jet')).toBe(0);
  });

  it('maps the free-text lists once, love winning a tie', () => {
    expect(paletteFromWords(['navy', 'Greens'], ['navy', 'Mustard', '???'])).toEqual({
      fam: { greens: 1 },
      shade: { navy: 1, mustard: -1 },
      print: {},
    });
  });

  it('renders love weighted up and avoid as soft, never a hard no', () => {
    const lines = paletteLines({
      palette: { fam: { blues: 1 }, shade: { cobalt: -1 }, print: { stripes: 1, florals: -1 } },
    });
    expect(lines[0]).toContain('the ones she loves: Blues (not cobalt).');
    expect(lines[1]).toContain("COLOURS SHE'D RATHER NOT BUY — cobalt.");
    expect(lines[1]).toContain('hers to wear');
    expect(lines.join('\n')).not.toMatch(/never style/i);
    expect(lines[2]).toContain('PRINTS she loves: stripes');
    expect(lines[3]).toContain("PRINTS she'd rather not buy: florals");
  });

  it('reads the free-text lists until she sets a palette', () => {
    const dna = {
      user_overrides: { loved_colors: ['Navy'] },
      brief: { colours: { rejected: ['red'] } },
    };
    expect(paletteLines(dna).join('\n')).toContain('loves: navy');
    expect(paletteLines(dna).join('\n')).toContain('NOT BUY — Reds');
    expect(paletteLines({ ...dna, palette: { fam: { greens: 1 } } }).join('\n')).not.toContain(
      'navy',
    );
  });
});

describe('editing', () => {
  const none = { colourShade: null, colourExtra: [], print: null };

  it('picks a main shade and toggles up to three more, never the main one twice', () => {
    let v = pickShade(none, 'navy', 'main');
    v = pickShade(v, 'optic', 'extra');
    v = pickShade(v, 'navy', 'extra');
    expect(v).toEqual({ colourShade: 'navy', colourExtra: ['optic'], print: null });
    v = ['gold', 'jet', 'ivory'].reduce((acc, id) => pickShade(acc, id, 'extra'), v);
    expect(v.colourExtra).toEqual(['optic', 'gold', 'jet']);
    expect(pickShade(v, 'optic', 'extra').colourExtra).toEqual(['gold', 'jet']);
    expect(pickShade(v, 'optic', 'main')).toMatchObject({
      colourShade: 'optic',
      colourExtra: ['gold', 'jet'],
    });
  });

  it('sets and clears a preference, and matches a family again', () => {
    let p = setPreference(cleanPalette({}), 'fam', 'blues', 1);
    p = setPreference(p, 'shade', 'cobalt', -1);
    p = setPreference(p, 'shade', 'jet', -1);
    expect(p).toEqual({ fam: { blues: 1 }, shade: { cobalt: -1, jet: -1 }, print: {} });
    expect(setPreference(p, 'fam', 'blues', 0).fam).toEqual({});
    expect(matchFamily(p, 'blues').shade).toEqual({ jet: -1 });
    expect(paletteTally(p, 'colours')).toEqual({ love: 1, avoid: 2 });
    expect(paletteTally(p, 'prints')).toEqual({ love: 0, avoid: 0 });
  });
});

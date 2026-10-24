import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATERIAL_FAMILY,
  familyOfMaterial,
  MATERIAL_FAMILIES,
  MATERIAL_FAMILY_IDS,
  MATERIAL_IDS,
  MATERIALS,
  material,
  materialFamily,
  materialPromptBlock,
  resolveMaterial,
} from './index';

describe('material model', () => {
  it('has seven families and 40 materials, each in exactly one family', () => {
    expect(MATERIAL_FAMILY_IDS).toEqual([
      'natural',
      'cloth',
      'synthetic',
      'leather',
      'regenerated',
      'faux',
      'hard',
    ]);
    expect(MATERIAL_FAMILIES.map((f) => f.materials.length)).toEqual([9, 8, 4, 6, 5, 4, 4]);
    expect(MATERIALS).toHaveLength(40);
    expect(new Set(MATERIAL_IDS).size).toBe(40);
    for (const f of MATERIAL_FAMILIES) for (const m of f.materials) expect(m.family).toBe(f.id);
    expect(materialFamily(DEFAULT_MATERIAL_FAMILY)?.name).toBe('Natural');
  });

  it('keeps the shared ids and the wardrobe order', () => {
    expect(MATERIAL_IDS.slice(0, 3)).toEqual(['cotton', 'wool', 'linen']);
    expect(materialFamily('cloth')?.materials.at(-1)).toMatchObject({
      id: 'sequin',
      name: 'Sequins & glitter',
    });
    expect(material('polyamide')).toMatchObject({ hint: 'Also nylon', family: 'synthetic' });
    expect(material('vegan_leather')?.name).toBe('Vegan leather');
    expect(material('cotton')?.hint).toBe('');
  });

  it('derives the family from the id, never stores it', () => {
    expect(familyOfMaterial('denim')?.id).toBe('cloth');
    expect(familyOfMaterial('LYOCELL')?.name).toBe('Plant-based');
    expect(familyOfMaterial('other')).toBeNull();
    expect(familyOfMaterial(null)).toBeNull();
  });

  it('resolves an id, a name or a synonym, else null', () => {
    expect(resolveMaterial('cotton')).toBe('cotton');
    expect(resolveMaterial('  Patent leather ')).toBe('patent');
    expect(resolveMaterial('vegan leather')).toBe('vegan_leather');
    expect(resolveMaterial('faux fur')).toBe('faux_fur');
    for (const [word, id] of [
      ['nylon', 'polyamide'],
      ['Spandex', 'elastane'],
      ['lycra', 'elastane'],
      ['rayon', 'viscose'],
      ['Tencel', 'lyocell'],
      ['PU', 'vegan_leather'],
      ['faux leather', 'vegan_leather'],
      ['pleather', 'vegan_leather'],
      ['lambswool', 'wool'],
      ['merino wool', 'merino'],
      ['sheepskin', 'shearling'],
      ['crocodile', 'exotic'],
      ['snakeskin', 'exotic'],
      ['pvc', 'vinyl'],
      ['plastic', 'resin'],
      ['raffia', 'straw'],
      ['glitter', 'sequin'],
    ] as const) {
      expect(resolveMaterial(word)).toBe(id);
    }
    expect(resolveMaterial('knit')).toBeNull();
    expect(resolveMaterial('unobtainium')).toBeNull();
    expect(resolveMaterial('')).toBeNull();
    expect(resolveMaterial(undefined)).toBeNull();
  });

  it('files a blend under the main fibre, the first a label names', () => {
    expect(resolveMaterial('95% cotton, 5% elastane')).toBe('cotton');
    expect(resolveMaterial('70% Wool / 30% Polyamide')).toBe('wool');
    expect(resolveMaterial('nylon and spandex')).toBe('polyamide');
  });

  it('lists every material id in the prompt block, one family a line', () => {
    const block = materialPromptBlock();
    expect(block.split('\n')).toHaveLength(7);
    for (const id of MATERIAL_IDS) expect(block).toContain(`${id} — `);
    expect(block).toContain('polyamide — Polyamide (also nylon)');
    expect(block.startsWith('Natural: cotton — Cotton; wool — Wool')).toBe(true);
  });
});

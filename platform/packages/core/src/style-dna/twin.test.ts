import { describe, expect, it } from 'vitest';
import { buildColorHarmony } from './compose';
import { briefList, styleDnaPromptBlock } from './prompt';
import {
  ageBandLabel,
  BRAND_POOL,
  chooseSeason,
  euShoe,
  euSize,
  feetInches,
  ICON_POOL,
  iconTag,
  investmentLabel,
  seasonChoices,
  stepFact,
  wallPool,
  wallRanked,
} from './twin';

describe('the twin vocabulary', () => {
  it('keeps the brand wall deduped and carries Liberty’s names', () => {
    const names = BRAND_POOL.map((n) => n.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    expect(BRAND_POOL).toEqual(expect.arrayContaining(['Zara', 'Chopova Lowena', 'The Row']));
    expect(ICON_POOL.every(([, tag]) => tag.length > 0)).toBe(true);
  });

  it('tags an icon from the pool, ignoring case and spacing', () => {
    expect(iconTag(' hailey  bieber ')).toBe('Clean-girl minimal');
    expect(iconTag('Someone Else')).toBe('');
  });

  it('seeds the pool with her types’ houses first', () => {
    expect(wallPool('brands', ['Avant-garde']).slice(0, 4)).toEqual([
      'Rick Owens',
      'Comme des Garçons',
      'Yohji Yamamoto',
      'Maison Margiela',
    ]);
    expect(wallPool('icons', [])[0]).toBe('Carolyn Bessette-Kennedy');
  });

  it('ranks unkept names by her types and what she kept, ties in pool order', () => {
    const ranked = wallRanked('brands', [], ['Nike']);
    expect(ranked).not.toContain('Nike');
    // Nike seeds Utility and Off-duty: Adidas shares both, so it leads.
    expect(ranked[0]).toBe('Adidas');
    expect(wallRanked('brands', [], [])).toEqual(wallPool('brands', []));
  });

  it('labels the investment level and age band the prompt reads', () => {
    expect(investmentLabel('500_1500')).toBe('€500–1,500');
    expect(investmentLabel(null)).toBe('');
    expect(ageBandLabel('45_54')).toBe('45–54');
  });

  it('steps the facts inside the prototype’s ranges', () => {
    expect(stepFact('heightCm', null, 1)).toBe(168);
    expect(stepFact('heightCm', 210, 1)).toBe(210);
    expect(stepFact('sizeUk', 10, 1)).toBe(12);
    expect(stepFact('sizeUk', 4, -1)).toBe(4);
    expect(stepFact('shoeUk', 5, 1)).toBe(5.5);
    expect(euSize(10)).toBe(38);
    expect(euShoe(5.5)).toBe(39);
    expect(feetInches(168)).toBe('5′6″');
  });

  it('offers the read season and its two neighbours, then the rest', () => {
    expect(seasonChoices('Soft Autumn', false)).toEqual([
      'Soft Autumn',
      'True Autumn',
      'Soft Summer',
    ]);
    expect(seasonChoices('Light Summer', false)[2]).toBe('Light Spring');
    const all = seasonChoices('Soft Autumn', true);
    expect(all).toHaveLength(12);
    expect(new Set(all).size).toBe(12);
    expect(seasonChoices(null, false)).toHaveLength(12);
  });

  it('renders a chosen season from the catalog, keeping the photograph’s values', () => {
    const read = buildColorHarmony({
      season: 'Soft Autumn',
      undertone: 'Warm',
      contrast: 'Low',
      skin_tone_hex: '#C69C7D',
    }).dna;
    const { render, dna } = chooseSeason('True Autumn', read);
    expect(render.season).toBe('True Autumn');
    expect(dna.archetype_name).toBe('True Autumn');
    expect(dna.verified_undertone).toBe('Warm');
    expect(dna.extracted_values.skin_tone_hex).toBe('#C69C7D');
    expect(dna.classification.source).toBe('chosen');
    expect(dna.classification.primitive_season).toBe(read.classification.primitive_season);
  });
});

describe('her brief in the prompt', () => {
  it('carries every kept line, never capped at eight (legacy 2026-10-13)', () => {
    const rules = Array.from({ length: 11 }, (_, i) => `Rule ${i + 1}`);
    expect(briefList(rules)).toHaveLength(11);
    const block = styleDnaPromptBlock({ brief: { rules } });
    expect(block).toContain('Rule 11');
    // Her brief leads, after the one line saying fenced text is data (SEC-23).
    expect(block.split('\n')[1]).toMatch(/^HER STYLE BRIEF/);
  });
});

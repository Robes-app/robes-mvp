import { describe, expect, it } from 'vitest';
import { buildSystem as buildSystemV1 } from './v1';
import { buildSystem, VERSION } from './v2';

const piece = (id: string, hero: boolean) => ({
  id,
  label: id,
  category: 'Tops',
  color: 'White',
  brand: null,
  timesWorn: 0,
  hero,
  seasonBand: hero ? ('spring_summer' as const) : null,
});
const ctx = {
  firstName: 'Niall',
  gender: 'woman' as const,
  styleIcons: [],
  styleDna: {},
  closet: [piece('p0', true), piece('p1', false)],
  shortlistIds: [],
};
const trip = {
  destination: 'Lisbon',
  dateFrom: '2026-10-02',
  dateTo: '2026-10-04',
  occasions: ['Dinner'],
};

describe('travel.edit v2', () => {
  it('uses the daily v2 hero rule and is otherwise v1', () => {
    const system = buildSystem(ctx, trip, 'note');
    expect(VERSION).toBe(2);
    expect(system).toContain('build AT MOST ONE hero into a look');
    expect(system).not.toContain('PRIORITISE it');
    const noHero = { ...ctx, closet: [piece('p1', false)] };
    expect(buildSystem(noHero, trip)).toBe(buildSystemV1(noHero, trip));
  });
});

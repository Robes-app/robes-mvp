import { describe, expect, it } from 'vitest';
import { buildSystem as buildSystemV1, type DailyClosetPiece } from './v1';
import { buildSystem, VERSION } from './v2';

const piece = (i: number, over: Partial<DailyClosetPiece> = {}): DailyClosetPiece => ({
  id: `id-${i}`,
  label: `Piece ${i}`,
  category: 'Tops',
  color: 'Navy',
  brand: null,
  timesWorn: 0,
  hero: false,
  seasonBand: null,
  ...over,
});
const ctx = { firstName: 'Niall', gender: 'woman' as const, styleIcons: [], styleDna: {} };

describe('today.daily v2 prompt', () => {
  it('limits heroes to one signature per look and rotates them', () => {
    const closet = [piece(0, { hero: true, seasonBand: 'year_round' }), piece(1)];
    const system = buildSystem({ ...ctx, closet });
    expect(VERSION).toBe(2);
    expect(system).toContain('build AT MOST ONE hero into a look');
    expect(system).toContain('A look with no hero in it is a fine look.');
    expect(system).not.toContain('PRIORITISE it');
    expect(buildSystemV1({ ...ctx, closet })).toContain('PRIORITISE it');
  });

  it('matches v1 everywhere else', () => {
    const closet = [piece(0), piece(1)];
    expect(buildSystem({ ...ctx, closet })).toBe(buildSystemV1({ ...ctx, closet }));
  });
});

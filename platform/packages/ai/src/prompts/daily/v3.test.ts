import { describe, expect, it } from 'vitest';
import { HERO_DIRECTIVE as STYLE_PIECE_DIRECTIVE } from '../style-piece/v4';
import { buildSystem as buildSystemV1, type DailyClosetPiece } from './v1';
import { buildSystem as buildSystemV2 } from './v2';
import { buildSystem, HERO_DIRECTIVE, VERSION } from './v3';

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

describe('today.daily v3 prompt', () => {
  it('reads her starred pieces as taste, never a hero to build around', () => {
    const closet = [piece(0, { hero: true, seasonBand: 'autumn_winter' }), piece(1)];
    const system = buildSystem({ ...ctx, closet });
    expect(VERSION).toBe(3);
    expect(system).toContain('0: Piece 0 [Tops], Navy, ★ loved (Autumn/Winter)');
    expect(system).toContain(HERO_DIRECTIVE);
    // The two rules v3 supersedes: priority (v1) and build-around-one-rotated (v2).
    expect(system).not.toContain('PRIORITISE it');
    expect(system).not.toContain('build AT MOST ONE hero into a look');
    expect(system).not.toContain('★ HERO');
    expect(buildSystemV2({ ...ctx, closet })).toContain('build AT MOST ONE hero into a look');
  });

  it('says the same thing as style-a-piece, so a second ask cannot drift from the first', () => {
    expect(HERO_DIRECTIVE).toBe(STYLE_PIECE_DIRECTIVE);
  });

  it('matches v1 everywhere else', () => {
    const closet = [piece(0), piece(1)];
    expect(buildSystem({ ...ctx, closet })).toBe(buildSystemV1({ ...ctx, closet }));
  });
});

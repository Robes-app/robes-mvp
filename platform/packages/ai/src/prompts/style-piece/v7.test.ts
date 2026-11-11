import { describe, expect, it } from 'vitest';
import { buildSystem as buildSystemV6 } from './v6';
import { buildSystem, VERSION, WANTS_LEAD, wantedByLabel } from './v7';

const wishes = [
  { id: 'w1', label: 'Silk cami', category: 'Tops', color: 'coral', brand: 'Vince' },
  { id: 'w2', label: 'Canvas tote', category: 'Bags', color: null, brand: null },
];
const ctx = {
  firstName: 'Liberty',
  gender: 'woman' as const,
  styleIcons: [],
  closet: [],
  styleDna: {},
  wardrobeCount: 0,
  wishes,
};

describe('style-piece v7 — the Shop toggle', () => {
  it('is version 7 and leaves the system text as v6 unless Shop is on with wishes', () => {
    expect(VERSION).toBe(7);
    expect(buildSystem(ctx, 'dress-me')).toBe(buildSystemV6(ctx, 'dress-me'));
    expect(buildSystem(ctx, 'dress-me', { balance: 'owned' })).toBe(
      buildSystemV6(ctx, 'dress-me', { balance: 'owned' }),
    );
    expect(buildSystem({ ...ctx, wishes: [] }, 'dress-me', { balance: 'mix' })).toBe(
      buildSystemV6(ctx, 'dress-me', { balance: 'mix' }),
    );
  });

  it('with Shop on, names the pieces she wants before the formula, fenced', () => {
    const sys = buildSystem(ctx, 'dress-me', { balance: 'mix' });
    const wants = sys.indexOf(WANTS_LEAD);
    const formula = sys.indexOf('THE FORMULA');
    expect(wants).toBeGreaterThan(0);
    expect(wants).toBeLessThan(formula);
    expect(sys).toContain(
      '<user_input>\nSilk cami [Tops], coral, Vince; Canvas tote [Bags]\n</user_input>',
    );
  });

  it('matches a named piece to her wish by its exact label', () => {
    expect(wantedByLabel('  silk CAMI ', wishes)?.id).toBe('w1');
    expect(wantedByLabel('Silk camisole', wishes)).toBeNull();
    expect(wantedByLabel('Silk cami', undefined)).toBeNull();
  });
});

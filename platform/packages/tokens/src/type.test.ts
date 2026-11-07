import { describe, expect, it } from 'vitest';
import { SERIF_FLOOR, type TypeStyle, typeScale } from './tokens';

describe('type scale', () => {
  const styles = Object.entries(typeScale) as Array<[string, TypeStyle]>;

  it('keeps Cormorant at 17 or above, piece names alone at 15 in 400', () => {
    for (const [name, s] of styles) {
      if (s.family !== 'display') continue;
      if (name === 'piece-name') expect([s.size, s.weight]).toEqual([15, 400]);
      else expect(s.size).toBeGreaterThanOrEqual(SERIF_FLOOR);
    }
  });

  it('never sets the sans in italic', () => {
    for (const [, s] of styles) if (s.family === 'sans') expect(s.italic).toBeUndefined();
  });

  it('tracks every caps style', () => {
    for (const [, s] of styles) if (s.caps) expect(s.tracking).toBeGreaterThan(0);
  });
});

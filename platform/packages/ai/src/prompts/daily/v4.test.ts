import { PLACE_RULE, readPlace } from '@robes/core/landscape';
import { describe, expect, it } from 'vitest';
import { buildUser as buildUserV1 } from './v1';
import { buildSystem as buildSystemV3 } from './v3';
import { buildSystem, buildUser, VERSION } from './v4';

const ctx = {
  firstName: 'Niall',
  gender: 'woman' as const,
  styleIcons: [],
  styleDna: {},
  closet: [],
};
const london = { city: 'London', month: 'October', tempRange: '8–13°C', condition: 'rain' };

describe('today.daily v4 — the place she names', () => {
  it('is version 4 and carries the place rule before the wardrobe state', () => {
    expect(VERSION).toBe(4);
    const sys = buildSystem(ctx);
    expect(sys).toContain(PLACE_RULE);
    expect(sys.indexOf(PLACE_RULE)).toBeLessThan(sys.indexOf('WARDROBE STATE:'));
    expect(sys.replace(`\n\n${PLACE_RULE}`, '')).toBe(buildSystemV3(ctx));
  });

  it('renders THE PLACE when a landscape matched', () => {
    expect(buildSystem(ctx, readPlace('a ski day'))).toContain(
      'THE PLACE — the mountains · skiing.',
    );
    expect(buildSystem(ctx, readPlace('a casual Thursday'))).not.toContain('THE PLACE —');
  });

  it('dresses a named place for its own weather', () => {
    const user = buildUser('Lunch in Lisbon', london, {
      read: readPlace('Lunch in Lisbon'),
      there: {
        place: 'Lisbon, Portugal',
        tempRange: '15–21°C',
        condition: 'clear',
        seasonal: false,
      },
    });
    expect(user).toContain('She is dressing for Lisbon, Portugal. Forecast there: 15–21°C, clear.');
    expect(user).not.toContain('REAL-TIME CONTEXT');
    expect(user).toContain("The user's brief for today:");
  });

  it('is v1 for an ordinary day', () => {
    const plain = { read: readPlace('Studio day'), there: null };
    expect(buildUser('Studio day', london, plain)).toBe(buildUserV1('Studio day', london));
    expect(buildUser('Studio day', london)).toBe(buildUserV1('Studio day', london));
  });
});

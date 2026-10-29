import { PLACE_RULE, readPlace } from '@robes/core/landscape';
import { describe, expect, it } from 'vitest';
import { buildSystem as buildSystemV4, buildUser as buildUserV4 } from './v4';
import { ANCHOR_V5, buildSystem, buildUser, type DayContext, SCENE_PLACE, VERSION } from './v5';

const ctx = {
  firstName: 'Liberty',
  gender: 'woman' as const,
  styleIcons: [],
  closet: [],
  styleDna: {},
  wardrobeCount: 0,
};
const london: DayContext = {
  dayLabel: null,
  city: 'London',
  month: 'October',
  tempRange: '8–13°C',
  condition: 'rain',
};

describe('style-piece v5 — the place she names', () => {
  it('is version 5', () => {
    expect(VERSION).toBe(5);
  });

  it('carries the place rule, the anchor and the scene on every prompt', () => {
    for (const mode of ['piece', 'dress-me'] as const) {
      const sys = buildSystem(ctx, mode);
      expect(sys).toContain(ANCHOR_V5);
      expect(sys).toContain(PLACE_RULE);
      expect(sys).toContain(SCENE_PLACE);
      expect(sys).not.toContain('the hero piece for the weather and agenda');
      expect(sys).not.toContain('THE PLACE —');
    }
  });

  it('renders THE PLACE before the formula when a landscape matched', () => {
    const sys = buildSystem(ctx, 'dress-me', {}, readPlace('a coastal walk on Saturday'));
    expect(sys).toContain('THE PLACE — the coast · walking.');
    expect(sys.indexOf('THE PLACE —')).toBeLessThan(sys.indexOf('THE FORMULA —'));
  });

  it('changes nothing else in v4', () => {
    const v4 = buildSystemV4(ctx, 'dress-me');
    const v5 = buildSystem(ctx, 'dress-me')
      .replace(ANCHOR_V5, 'THE ANCHOR, the hero piece for the weather and agenda')
      .replace(` ${PLACE_RULE}`, '')
      .replace(` ${SCENE_PLACE}`, '');
    expect(v5).toBe(v4);
  });

  it('dresses a named place for its own weather, not her city', () => {
    const day: DayContext = {
      ...london,
      dayLabel: 'Saturday 31 October',
      place: {
        read: readPlace('a weekend in Lisbon'),
        there: {
          place: 'Lisbon, Portugal',
          tempRange: '15–21°C',
          condition: 'clear',
          seasonal: false,
        },
      },
    };
    const user = buildUser(
      { mode: 'dress-me', prompt: 'a weekend in Lisbon', day },
      { hasPhoto: false },
    );
    expect(user).toContain(
      'She is dressing for Lisbon, Portugal, Saturday 31 October. Forecast there: 15–21°C, clear.',
    );
    expect(user).not.toContain('London');
    expect(user).not.toContain('Dress the user for exactly this weather and place.');
    expect(user).toContain('Her brief for Saturday 31 October:');
  });

  it('demotes her own weather when the place has no name', () => {
    const day = { ...london, place: { read: readPlace('a weekend by the sea'), there: null } };
    const user = buildUser(
      { mode: 'dress-me', prompt: 'a weekend by the sea', day },
      { hasPhoto: false },
    );
    expect(user).toContain('Where she is now: London · October | 8–13°C | rain.');
    expect(user).not.toContain('Dress the user for exactly this weather and place.');
  });

  it('is v4 for an ordinary day and for a key piece', () => {
    const plain = { mode: 'dress-me' as const, prompt: 'a casual Thursday', day: london };
    expect(buildUser(plain, { hasPhoto: false })).toBe(buildUserV4(plain, { hasPhoto: false }));
    const placeless = {
      ...plain,
      day: { ...london, place: { read: readPlace('a casual Thursday'), there: null } },
    };
    expect(buildUser(placeless, { hasPhoto: false })).toBe(buildUserV4(plain, { hasPhoto: false }));
    const piece = { mode: 'piece' as const, anchor: { type: 'text' as const, text: 'a red coat' } };
    expect(buildUser(piece, { hasPhoto: false })).toBe(buildUserV4(piece, { hasPhoto: false }));
  });
});

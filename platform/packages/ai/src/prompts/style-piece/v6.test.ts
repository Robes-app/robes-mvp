import { describe, expect, it } from 'vitest';
import { buildSystem as buildSystemV5, buildUser as buildUserV5 } from './v5';
import { AROUND_LEAD, aroundBlock, buildSystem, buildUser, type DayContext, VERSION } from './v6';

const ctx = {
  firstName: 'Liberty',
  gender: 'woman' as const,
  styleIcons: [],
  closet: [],
  styleDna: {},
  wardrobeCount: 0,
};
const dublin: DayContext = {
  dayLabel: null,
  city: 'Dublin',
  month: 'November',
  tempRange: '9–13°C',
  condition: 'overcast',
};

describe('style-piece v6 — pieces to build around', () => {
  it('is version 6 and leaves the system text as v5', () => {
    expect(VERSION).toBe(6);
    expect(buildSystem(ctx, 'dress-me')).toBe(buildSystemV5(ctx, 'dress-me'));
  });

  it('names every chosen piece, by label, after her brief', () => {
    const around = [{ label: 'Tailored waistcoat' }, { label: 'Wide trousers', wearFor: ['Work'] }];
    const user = buildUser(
      { mode: 'dress-me', prompt: 'the office', day: dublin, around },
      { hasPhoto: false },
    );
    expect(user.endsWith(`${AROUND_LEAD} Tailored waistcoat; Wide trousers.`)).toBe(true);
    expect(user.indexOf('Her brief')).toBeLessThan(user.indexOf(AROUND_LEAD));
    expect(aroundBlock([{ label: '  ' }])).toBe('');
  });

  it('is v5 without pieces, and for a key piece', () => {
    const plain = { mode: 'dress-me' as const, prompt: 'the office', day: dublin };
    expect(buildUser(plain, { hasPhoto: false })).toBe(buildUserV5(plain, { hasPhoto: false }));
    expect(buildUser({ ...plain, around: [] }, { hasPhoto: false })).toBe(
      buildUserV5(plain, { hasPhoto: false }),
    );
    const piece = { mode: 'piece' as const, anchor: { type: 'text' as const, text: 'a red coat' } };
    expect(buildUser(piece, { hasPhoto: false })).toBe(buildUserV5(piece, { hasPhoto: false }));
  });
});

import { describe, expect, it } from 'vitest';
import { dayWordOf, drawerCta, drawerLine, flyoutCta, placeChipLabel, whenWord } from './diary';

const today = '2026-11-02';

describe('the drawer (design 3k)', () => {
  it('names the day the way the CTA speaks it', () => {
    expect(dayWordOf(today, today)).toBe('today');
    expect(dayWordOf('2026-11-03', today)).toBe('Tuesday');
    expect(whenWord(today, today)).toBe('today');
    expect(whenWord('2026-11-03', today)).toBe('on Tuesday');
  });

  it('changes a look: idle until she taps, then wear / wore / clear', () => {
    const base = { mode: 'change' as const, today };
    expect(drawerCta({ ...base, date: today, picks: 1, changed: false })).toEqual({
      label: 'Tap looks to add or take off today',
      ready: false,
    });
    expect(drawerCta({ ...base, date: today, picks: 1, changed: true }).label).toBe(
      'Wear this look today',
    );
    expect(drawerCta({ ...base, date: '2026-11-03', picks: 1, changed: true }).label).toBe(
      'Wear this look on Tuesday',
    );
    expect(drawerCta({ ...base, date: '2026-11-01', picks: 1, changed: true }).label).toBe(
      'Wore this on Sunday',
    );
    expect(drawerCta({ ...base, date: today, picks: 0, changed: true }).label).toBe('Clear today');
  });

  it('schedules one or several from Pick Look, muted until something changed', () => {
    const base = { mode: 'add' as const, today, date: '2026-11-03' };
    expect(drawerCta({ ...base, picks: 0, changed: false })).toEqual({
      label: 'Schedule Looks',
      ready: false,
    });
    expect(drawerCta({ ...base, picks: 1, changed: true })).toEqual({
      label: 'Schedule 1 Look',
      ready: true,
    });
    expect(drawerCta({ ...base, picks: 2, changed: true }).label).toBe('Schedule 2 Looks');
    expect(drawerCta({ ...base, picks: 2, changed: false })).toEqual({
      label: 'Schedule Looks',
      ready: false,
    });
  });

  it('lines each card: Scheduled, Adding, its wears, when it was saved, or that it waits', () => {
    const look = (over: object) =>
      ({ timesWorn: 0, createdAt: '2026-11-01T09:00:00.000Z', ...over }) as never;
    expect(drawerLine(look({}), true, true)).toBe('Scheduled');
    expect(drawerLine(look({}), true, false)).toBe('Adding');
    expect(drawerLine(look({ timesWorn: 3 }), false, false)).toBe('3 wears');
    expect(drawerLine(look({ timesWorn: 1 }), false, false)).toBe('1 wear');
    expect(drawerLine(look({}), false, false)).toBe('Saved Sun 1 Nov');
    expect(drawerLine(look({ createdAt: '' }), false, false)).toBe('Not worn yet');
  });

  it('names the place with the day’s range, without the unit', () => {
    expect(placeChipLabel('Dublin', '9–13°C')).toBe('Dublin, 9–13°');
    expect(placeChipLabel('Dublin', null)).toBe('Dublin');
  });

  it('the flyout’s foot: tap to add, Include n, or Clear once she unticks what it carried', () => {
    expect(flyoutCta(0, 0)).toEqual({ label: 'Tap pieces to add them', ready: false });
    expect(flyoutCta(1, 0)).toEqual({ label: 'Include 1 Piece', ready: true });
    expect(flyoutCta(2, 1)).toEqual({ label: 'Include 2 Pieces', ready: true });
    expect(flyoutCta(0, 2)).toEqual({ label: 'Clear pieces', ready: true });
  });
});

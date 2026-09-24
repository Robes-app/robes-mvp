import { describe, expect, it } from 'vitest';
import { decide, isoWeek, localParts, type NotifyState, type Recipient } from './rules';

const DAY = 86_400_000;
const NOW = new Date('2026-09-24T06:10:00Z'); // 07:10 in Dublin (IST)
const user = (over: Partial<Recipient> = {}): Recipient => ({
  id: 'u1',
  email: 'niall@test.dev',
  timezone: 'Europe/Dublin',
  prefs: { looksReady: true, morningCue: true, nudges: true, receipts: true },
  createdAt: new Date(NOW.getTime() - 30 * DAY),
  ...over,
});
const state = (over: Partial<NotifyState> = {}): NotifyState => ({
  ledger: [],
  latestIdea: null,
  readyPieces: 0,
  fifthPieceAt: null,
  looks: 0,
  plan: [],
  ...over,
});
const idea = {
  id: 'i1',
  title: 'Camel coat',
  readyFrames: 1,
  createdAt: new Date(NOW.getTime() - DAY),
};

describe('notify rules', () => {
  it('reads her clock, not the server’s', () => {
    expect(localParts(NOW, 'Europe/Dublin')).toMatchObject({ date: '2026-09-24', hour: 7 });
    expect(localParts(NOW, 'Australia/Sydney')).toMatchObject({ date: '2026-09-24', hour: 16 });
    expect(localParts(NOW, 'Not/AZone').date).toBe('2026-09-24');
    expect(isoWeek('2026-09-24')).toBe('2026-W39');
    expect(isoWeek('2027-01-01')).toBe('2026-W53');
  });

  it('sends looks_ready once per idea, once the hero frame is ready, only within 48 h', () => {
    expect(decide(user(), state({ latestIdea: idea }), NOW)[0]).toMatchObject({
      kind: 'looks_ready',
      ref: 'i1',
    });
    expect(decide(user(), state({ latestIdea: { ...idea, readyFrames: 0 } }), NOW)).toEqual([]);
    const old = { ...idea, createdAt: new Date(NOW.getTime() - 3 * DAY) };
    expect(decide(user(), state({ latestIdea: old }), NOW)).toEqual([]);
    const sent = [{ kind: 'looks_ready', ref: 'i1', sentAt: new Date(NOW.getTime() - 2 * DAY) }];
    expect(decide(user(), state({ latestIdea: idea, ledger: sent }), NOW)).toEqual([]);
    expect(
      decide(
        user({ prefs: { ...user().prefs, looksReady: false } }),
        state({ latestIdea: idea }),
        NOW,
      ),
    ).toEqual([]);
  });

  it('sends at most one sequence email per local day', () => {
    const today = [{ kind: 'five', ref: 'five', sentAt: new Date(NOW.getTime() - 3_600_000) }];
    expect(decide(user(), state({ latestIdea: idea, ledger: today }), NOW)).toEqual([]);
  });

  it('nudges only when she opted in', () => {
    const five = state({ readyPieces: 5, fifthPieceAt: new Date(NOW.getTime() - 2 * DAY) });
    expect(decide(user(), five, NOW)[0]?.kind).toBe('five');
    expect(decide(user({ prefs: { ...user().prefs, nudges: false } }), five, NOW)).toEqual([]);
    const tooSoon = state({ readyPieces: 5, fifthPieceAt: new Date(NOW.getTime() - 3_600_000) });
    expect(decide(user(), tooSoon, NOW)).toEqual([]);
  });

  it('week_empty needs an empty week, once per ISO week and not within 14 days', () => {
    expect(decide(user(), state({ looks: 2 }), NOW)[0]).toMatchObject({
      kind: 'week_empty',
      ref: '2026-W39',
    });
    const planned = [{ date: '2026-09-26', lookName: 'Office', activity: null, slot: 'day' }];
    expect(decide(user(), state({ looks: 2, plan: planned }), NOW)).toEqual([]);
    const recent = [
      { kind: 'week_empty', ref: '2026-W38', sentAt: new Date(NOW.getTime() - 8 * DAY) },
    ];
    expect(decide(user(), state({ looks: 2, ledger: recent }), NOW)).toEqual([]);
  });

  it('sends the morning cue at 07:00 her time, only on a planned day, once', () => {
    const plan = [
      { date: '2026-09-24', lookName: 'Gallery opening', activity: 'Board meeting', slot: 'day' },
    ];
    const nudgesOff = user({ prefs: { ...user().prefs, nudges: false } });
    expect(decide(nudgesOff, state({ plan }), NOW)).toEqual([
      expect.objectContaining({
        kind: 'morning',
        ref: '2026-09-24',
        title: 'Board meeting',
        look: 'Gallery opening',
        weekday: 'Thursday',
      }),
    ]);
    expect(decide(nudgesOff, state({ plan }), new Date(NOW.getTime() + 3_600_000))).toEqual([]);
    const sent = [{ kind: 'morning', ref: '2026-09-24', sentAt: NOW }];
    expect(decide(nudgesOff, state({ plan, ledger: sent }), NOW)).toEqual([]);
    expect(decide(nudgesOff, state(), NOW)).toEqual([]);
  });

  it('an overnight look is enough for the morning cue, and opens that look', () => {
    const nudgesOff = user({ prefs: { ...user().prefs, nudges: false } });
    const overnight = [{ id: 'daily-1', date: '2026-09-24', headline: 'Linen and loafers' }];
    expect(decide(nudgesOff, state({ overnight }), NOW)).toEqual([
      expect.objectContaining({
        kind: 'morning',
        ref: '2026-09-24',
        title: 'Linen and loafers',
        dailyLookId: 'daily-1',
      }),
    ]);
    // A planned day still wins; yesterday's overnight look doesn't count; the pref is respected.
    const plan = [{ date: '2026-09-24', lookName: 'Office', activity: null, slot: 'day' }];
    expect(decide(nudgesOff, state({ overnight, plan }), NOW)[0]).not.toHaveProperty('dailyLookId');
    const old = [{ id: 'daily-0', date: '2026-09-23', headline: 'x' }];
    expect(decide(nudgesOff, state({ overnight: old }), NOW)).toEqual([]);
    const off = user({ prefs: { ...user().prefs, nudges: false, morningCue: false } });
    expect(decide(off, state({ overnight }), NOW)).toEqual([]);
  });

  it('nudges look_waiting once when she has a saved look and no model, after her first day', () => {
    const waiting = state({
      looks: 1,
      hasModel: false,
      newestLook: { id: 'l1', name: 'Gallery opening' },
    });
    expect(decide(user(), waiting, NOW)[0]).toMatchObject({
      kind: 'look_waiting',
      ref: 'l1',
      look: 'Gallery opening',
    });
    expect(decide(user(), { ...waiting, hasModel: true }, NOW)[0]?.kind).not.toBe('look_waiting');
    // Unknown model state never nudges.
    expect(decide(user(), { ...waiting, hasModel: undefined }, NOW)[0]?.kind).not.toBe(
      'look_waiting',
    );
    const newcomer = user({ createdAt: new Date(NOW.getTime() - 3_600_000) });
    expect(decide(newcomer, waiting, NOW)[0]?.kind).not.toBe('look_waiting');
    const sent = [{ kind: 'look_waiting', ref: 'l0', sentAt: new Date(NOW.getTime() - 5 * DAY) }];
    expect(decide(user(), { ...waiting, ledger: sent }, NOW)[0]?.kind).not.toBe('look_waiting');
    expect(decide(user({ prefs: { ...user().prefs, nudges: false } }), waiting, NOW)).toEqual([]);
  });
});

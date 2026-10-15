import { describe, expect, it } from 'vitest';
import {
  decide,
  isoWeek,
  localParts,
  type NotifyState,
  plan,
  type Recipient,
  weekOneNext,
} from './rules';

const DAY = 86_400_000;
const NOW = new Date('2026-09-24T06:10:00Z'); // 07:10 in Dublin (IST)
// Sequence mails wait for her 08:00–20:00 (7-day brief delta 6).
const MID = new Date('2026-09-24T09:10:00Z'); // 10:10 in Dublin
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
    expect(decide(user(), state({ latestIdea: idea }), MID)[0]).toMatchObject({
      kind: 'looks_ready',
      ref: 'i1',
    });
    expect(decide(user(), state({ latestIdea: { ...idea, readyFrames: 0 } }), MID)).toEqual([]);
    const old = { ...idea, createdAt: new Date(NOW.getTime() - 3 * DAY) };
    expect(decide(user(), state({ latestIdea: old }), MID)).toEqual([]);
    const sent = [{ kind: 'looks_ready', ref: 'i1', sentAt: new Date(NOW.getTime() - 2 * DAY) }];
    // Sent: the next day she hears pick_one instead, if she kept nothing.
    expect(decide(user(), state({ latestIdea: idea, ledger: sent }), MID)[0]?.kind).toBe(
      'pick_one',
    );
    const kept = {
      looks: 1,
      plan: [{ date: '2026-09-25', lookName: 'x', activity: null, slot: 'day' }],
    };
    expect(decide(user(), state({ latestIdea: idea, ledger: sent, ...kept }), MID)).toEqual([]);
    expect(
      decide(
        user({ prefs: { ...user().prefs, looksReady: false } }),
        state({ latestIdea: idea, ...kept }),
        MID,
      ),
    ).toEqual([]);
  });

  it('sends at most one sequence email per local day', () => {
    const today = [{ kind: 'five', ref: 'five', sentAt: new Date(NOW.getTime() - 3_600_000) }];
    expect(decide(user(), state({ latestIdea: idea, ledger: today }), MID)).toEqual([]);
  });

  it('nudges only when she opted in', () => {
    const five = state({ readyPieces: 5, fifthPieceAt: new Date(NOW.getTime() - 2 * DAY) });
    expect(decide(user(), five, MID)[0]?.kind).toBe('five');
    expect(decide(user({ prefs: { ...user().prefs, nudges: false } }), five, MID)).toEqual([]);
    const tooSoon = state({ readyPieces: 5, fifthPieceAt: new Date(NOW.getTime() - 3_600_000) });
    expect(decide(user(), tooSoon, MID)).toEqual([]);
  });

  it('week_empty needs an empty week, once per ISO week and not within 14 days', () => {
    expect(decide(user(), state({ looks: 2 }), MID)[0]).toMatchObject({
      kind: 'week_empty',
      ref: '2026-W39',
    });
    const planned = [{ date: '2026-09-26', lookName: 'Office', activity: null, slot: 'day' }];
    expect(decide(user(), state({ looks: 2, plan: planned }), MID)).toEqual([]);
    const recent = [
      { kind: 'week_empty', ref: '2026-W38', sentAt: new Date(NOW.getTime() - 8 * DAY) },
    ];
    expect(decide(user(), state({ looks: 2, ledger: recent }), MID)).toEqual([]);
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
    expect(decide(user(), waiting, MID)[0]).toMatchObject({
      kind: 'look_waiting',
      ref: 'l1',
      look: 'Gallery opening',
    });
    expect(decide(user(), { ...waiting, hasModel: true }, MID)[0]?.kind).not.toBe('look_waiting');
    // Unknown model state never nudges.
    expect(decide(user(), { ...waiting, hasModel: undefined }, MID)[0]?.kind).not.toBe(
      'look_waiting',
    );
    const newcomer = user({ createdAt: new Date(NOW.getTime() - 3_600_000) });
    expect(decide(newcomer, waiting, MID)[0]?.kind).not.toBe('look_waiting');
    const sent = [{ kind: 'look_waiting', ref: 'l0', sentAt: new Date(NOW.getTime() - 5 * DAY) }];
    expect(decide(user(), { ...waiting, ledger: sent }, MID)[0]?.kind).not.toBe('look_waiting');
    expect(decide(user({ prefs: { ...user().prefs, nudges: false } }), waiting, MID)).toEqual([]);
  });

  it('waits for her 08:00–20:00 for sequence mail', () => {
    const five = state({ readyPieces: 5, fifthPieceAt: new Date(NOW.getTime() - 2 * DAY) });
    expect(decide(user(), five, NOW)).toEqual([]);
    expect(decide(user(), five, new Date('2026-09-24T19:30:00Z'))).toEqual([]);
    expect(decide(user(), five, MID)[0]?.kind).toBe('five');
  });
});

describe('the first seven days (legacy 7-day brief)', () => {
  const joined = (hours: number) =>
    user({ createdAt: new Date(MID.getTime() - hours * 3_600_000) });

  it('first_piece: four hours in and nothing filed or styled, once', () => {
    expect(decide(joined(5), state({ started: false }), MID)[0]).toMatchObject({
      kind: 'first_piece',
      ref: 'first',
      pref: 'nudges',
    });
    // A nudge: the nudges preference, and only inside her first two days.
    const off = user({
      createdAt: new Date(MID.getTime() - 5 * 3_600_000),
      prefs: { ...user().prefs, nudges: false },
    });
    expect(decide(off, state({ started: false }), MID)).toEqual([]);
    expect(decide(joined(24 * 30), state({ started: false }), MID)).toEqual([]);
    expect(decide(joined(3), state({ started: false }), MID)).toEqual([]);
    expect(decide(joined(5), state({ started: true }), MID)).toEqual([]);
    // Unknown never mails.
    expect(decide(joined(5), state(), MID)).toEqual([]);
    const sent = [{ kind: 'first_piece', ref: 'first', sentAt: new Date(MID.getTime() - 2 * DAY) }];
    expect(decide(joined(60), state({ started: false, ledger: sent }), MID)).toEqual([]);
  });

  it('pick_one: a day after the three ways, nothing kept — ahead of look_waiting', () => {
    const shown = { ...idea, createdAt: new Date(MID.getTime() - 25 * 3_600_000) };
    const sent = [{ kind: 'looks_ready', ref: 'i1', sentAt: new Date(MID.getTime() - 2 * DAY) }];
    expect(decide(joined(30), state({ latestIdea: shown, ledger: sent }), MID)[0]).toMatchObject({
      kind: 'pick_one',
      ref: 'i1',
      piece: 'Camel coat',
    });
    const fresh = { ...idea, createdAt: new Date(MID.getTime() - 3_600_000) };
    expect(decide(joined(30), state({ latestIdea: fresh, ledger: sent }), MID)).toEqual([]);
  });

  it('the push-only nudges need a device: the model on day 2, the batch on day 4', () => {
    const look = { looks: 1, hasModel: false, newestLook: { id: 'l1', name: 'Office' } };
    const waited = [
      { kind: 'look_waiting', ref: 'l1', sentAt: new Date(MID.getTime() - DAY - 60_000) },
    ];
    const plan = [{ date: '2026-09-25', lookName: 'x', activity: null, slot: 'day' }];
    const day2 = state({ ...look, ledger: waited, plan, readyPieces: 6 });
    expect(decide(joined(50), { ...day2, hasPush: true }, MID)[0]).toMatchObject({
      kind: 'model_nudge',
      channel: 'push',
      look: 'Office',
    });
    expect(decide(joined(50), day2, MID)).toEqual([]);
    const day4 = state({ hasModel: true, readyPieces: 3, hasPush: true, plan });
    expect(decide(joined(100), day4, MID)[0]).toMatchObject({
      kind: 'batch_nudge',
      remaining: 2,
    });
  });

  it('week_one on day 6: her week in words and the first tier she has not reached', () => {
    const plan = [{ date: '2026-09-24', lookName: 'Office', activity: null, slot: 'day' }];
    const s = state({ readyPieces: 7, looks: 2, hasModel: true, plan });
    expect(decide(joined(6 * 24 + 1), s, MID)[0]).toMatchObject({
      kind: 'week_one',
      ref: 'week1',
      counts: { pieces: 7, looks: 2, model: true, dressed: 'Thursday' },
      next: 'wear',
    });
    expect(weekOneNext(state({ looks: 1, hasModel: false, plan }), '2026-09-24')).toBe('model');
    expect(weekOneNext(state({ readyPieces: 2, hasModel: true }), '2026-09-24')).toBe('five');
    expect(weekOneNext(state({ readyPieces: 6, hasModel: true }), '2026-09-24')).toBe('plan');
    const worn = [{ ...plan[0], worn: true }] as NotifyState['plan'];
    expect(weekOneNext(state({ readyPieces: 6, plan: worn }), '2026-09-24')).toBe('done');
  });

  it('plan_a_day: week_empty from day 5', () => {
    expect(decide(joined(5 * 24 + 1), state({ looks: 1 }), MID)[0]?.kind).toBe('week_empty');
    expect(decide(joined(4 * 24), state({ looks: 1 }), MID)).toEqual([]);
  });

  it('Wore it? at 19:00 on a dressed day not yet worn, by push only', () => {
    const evening = new Date('2026-09-24T18:05:00Z'); // 19:05 in Dublin
    const plan = [{ date: '2026-09-24', lookName: 'Office', activity: null, slot: 'day' }];
    const off = user({ prefs: { ...user().prefs, nudges: false } });
    expect(decide(off, state({ plan, hasPush: true }), evening)).toEqual([
      expect.objectContaining({ kind: 'wore_it', ref: '2026-09-24', channel: 'push' }),
    ]);
    expect(decide(off, state({ plan }), evening)).toEqual([]);
    const worn = [{ ...plan[0], worn: true }] as NotifyState['plan'];
    expect(decide(off, state({ plan: worn, hasPush: true }), evening)).toEqual([]);
  });

  it('one-time kinds read her whole ledger, not the 30-day window', () => {
    const five = state({ readyPieces: 5, fifthPieceAt: new Date(MID.getTime() - 40 * DAY) });
    expect(decide(user(), five, MID)[0]?.kind).toBe('five');
    expect(decide(user(), { ...five, onceSent: ['five'] }, MID)).toEqual([]);
    const waiting = state({
      looks: 1,
      hasModel: false,
      newestLook: { id: 'l9', name: 'A newer look' },
      onceSent: ['look_waiting'],
      plan: [{ date: '2026-09-25', lookName: 'x', activity: null, slot: 'day' }],
    });
    expect(decide(user(), waiting, MID)).toEqual([]);
  });

  it('an old or migrated account is never swept into the first week', () => {
    const old = user({ createdAt: new Date(MID.getTime() - 400 * DAY) });
    const s = state({
      started: false,
      hasPush: true,
      looks: 1,
      hasModel: false,
      newestLook: { id: 'l1', name: 'Office' },
      onceSent: ['look_waiting'],
      plan: [{ date: '2026-09-25', lookName: 'x', activity: null, slot: 'day' }],
    });
    expect(decide(old, s, MID)).toEqual([]);
  });

  it('plan() ranks every eligible message so a collision falls through to the next', () => {
    const s = state({
      started: false,
      readyPieces: 5,
      fifthPieceAt: new Date(MID.getTime() - 2 * DAY),
    });
    const { sequence } = plan(joined(5), s, MID);
    expect(sequence.map((m) => m.kind)).toEqual(['first_piece', 'five']);
  });
});

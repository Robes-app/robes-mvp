import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Style DNA complete and a twin on file unless a test says otherwise, so the older kinds read alone.
const done = {
  genderIdentity: 'woman',
  ageBand: '35_44',
  investmentLevel: 'mid',
  styleArchetypes: ['classic'],
  styleBrands: ['Toteme'],
};
const profile: Record<string, unknown> = {
  timezone: 'Europe/Dublin',
  createdAt: new Date('2026-10-20T10:00:00Z'),
  ...done,
};
const twin = { headshotAssetId: 'a', twinAssetId: null, twinDrawStatus: null };
const cards = { twinHad: true, twin: null, dna: null } as {
  twinHad: boolean;
  twin: { n: 1 | 2; at: string } | null;
  dna: { n: 1 | 2; at: string } | null;
};
const repos = {
  profiles: { get: vi.fn(async () => profile) },
  inbox: {
    listHeld: vi.fn(async () => [] as { retailer: string | null; receivedAt?: Date }[]),
  },
  looks: { wornDays: vi.fn(async () => [] as string[]), count: vi.fn(async () => 3) },
  uiState: {
    dismissed: vi.fn(async () => ({}) as Record<string, string>),
    dismiss: vi.fn(),
    bell: vi.fn(async () => ({ seenAt: null as Date | null, cards })),
    markBellSeen: vi.fn(),
    markTwinHad: vi.fn(),
    putAwayCard: vi.fn(),
  },
  model: { get: vi.fn(async () => twin as Record<string, unknown> | undefined) },
  styleDna: { pendingSince: vi.fn(async () => null as Date | null) },
  dailyLooks: {
    overnightFor: vi.fn(
      async () =>
        null as {
          id: string;
          title: string;
          subtitle: string | null;
          createdAt: Date;
        } | null,
    ),
  },
};
vi.mock('./db', () => ({ repos }));
const capture = vi.fn(async () => {});
vi.mock('./analytics', () => ({ serverAnalytics: { capture } }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn() } }));

const { loadNotifications, dismissNotification, markBellSeen } = await import('./notifications');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');
// Monday 2 November 2026, 09:00 in Dublin.
const now = new Date('2026-11-02T09:00:00Z');

beforeEach(() => {
  repos.inbox.listHeld.mockResolvedValue([]);
  repos.looks.wornDays.mockResolvedValue([]);
  repos.looks.count.mockResolvedValue(3);
  repos.uiState.dismissed.mockResolvedValue({});
  repos.dailyLooks.overnightFor.mockResolvedValue(null);
  repos.uiState.bell.mockResolvedValue({ seenAt: null, cards });
  repos.model.get.mockResolvedValue(twin);
  repos.styleDna.pendingSince.mockResolvedValue(null);
  Object.assign(profile, done);
  vi.clearAllMocks();
});

describe('the bell', () => {
  it('lists receipts to review, then the unlogged days of the last week, newest first', async () => {
    repos.inbox.listHeld.mockResolvedValue([{ retailer: 'Arket' }, { retailer: 'COS' }]);
    repos.looks.wornDays.mockResolvedValue(['2026-10-31', '2026-11-01']);
    const { items } = await loadNotifications(ann, now);
    expect(items.map((i) => [i.key, i.text, i.line, i.date])).toEqual([
      ['receipts:2', '2 receipts to review', 'From Arket and COS', null],
      ['diary:2026-10-30', 'Log Friday’s wear', 'Nothing filed for the 30th', '2026-10-30'],
      ['diary:2026-10-29', 'Log Thursday’s wear', 'Nothing filed for the 29th', '2026-10-29'],
      ['diary:2026-10-28', 'Log Wednesday’s wear', 'Nothing filed for the 28th', '2026-10-28'],
    ]);
    expect(repos.looks.wornDays).toHaveBeenCalledWith(ann, '2026-10-26', '2026-11-02');
  });

  it('leads with the look Robes made overnight, which opens the daily look (D2)', async () => {
    repos.dailyLooks.overnightFor.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Monday, layered',
      subtitle: 'Wool under a trench',
      createdAt: new Date('2026-11-02T04:00:00Z'),
    });
    repos.looks.count.mockResolvedValue(0);
    const { items } = await loadNotifications(ann, now);
    expect(items).toEqual([
      {
        key: 'overnight:22222222-2222-4222-8222-222222222222',
        kind: 'overnight',
        text: 'See today’s look',
        line: 'Wool under a trench',
        date: '2026-11-02',
        lookId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
  });

  it('keeps what she dismissed away, and asks for nothing before she has a look', async () => {
    repos.uiState.dismissed.mockResolvedValue({ 'diary:2026-11-01': '2026-11-02T08:00:00Z' });
    const { items } = await loadNotifications(ann, now);
    expect(items.map((i) => i.key)).not.toContain('diary:2026-11-01');
    // Three nudges at most (design 19 Nov); the dismissed day's place stays empty.
    expect(items.map((i) => i.key)).toEqual(['diary:2026-10-31', 'diary:2026-10-30']);
    repos.looks.count.mockResolvedValue(0);
    expect((await loadNotifications(ann, now)).items).toEqual([]);
    await dismissNotification(ann, { key: 'receipts:1' });
    expect(repos.uiState.dismiss).toHaveBeenCalledWith(ann, 'receipts:1');
  });

  it('the ✓ dismisses every item the bell holds in one write (PRD rev 3 §10 12)', async () => {
    const { items } = await loadNotifications(ann, now);
    await dismissNotification(ann, { all: true }, now);
    expect(repos.uiState.dismiss).toHaveBeenCalledWith(
      ann,
      items.map((i) => i.key),
    );
  });

  it('the old ✓ never reaches the Twin and Style DNA cards', async () => {
    Object.assign(profile, { investmentLevel: null });
    repos.uiState.bell.mockResolvedValue({ seenAt: null, cards: { ...cards, twinHad: false } });
    repos.model.get.mockResolvedValue(undefined);
    await dismissNotification(ann, { all: true }, now);
    const keys = repos.uiState.dismiss.mock.calls[0]?.[1] as string[];
    expect(keys.some((k) => k.startsWith('twin') || k.startsWith('dna'))).toBe(false);
  });
});

describe('the onboarding cards', () => {
  it('lead with Twin, Style DNA and Observations, in that order, before the older kinds', async () => {
    Object.assign(profile, { genderIdentity: 'woman', ageBand: null, investmentLevel: null });
    repos.uiState.bell.mockResolvedValue({ seenAt: null, cards: { ...cards, twinHad: false } });
    repos.model.get.mockResolvedValue(undefined);
    repos.styleDna.pendingSince.mockResolvedValue(new Date('2026-11-01T10:00:00Z'));
    repos.inbox.listHeld.mockResolvedValue([{ retailer: 'COS', receivedAt: now }]);
    const res = await loadNotifications(ann, now);
    expect(res.cards.map((c) => [c.kind, c.key, c.text, c.section])).toEqual([
      ['twin', 'twin:1', 'Create your digital twin', null],
      ['dna', 'dna:1', 'Finish your Style DNA', 'age'],
      ['observations', 'observations:2026-11-01T10:00:00.000Z', 'New observations to review', null],
      ['receipts', 'receipts:1', '1 receipt to review', null],
      ['diary', 'diary:2026-11-01', 'Log Sunday’s wear', null],
      ['diary', 'diary:2026-10-31', 'Log Saturday’s wear', null],
      ['diary', 'diary:2026-10-30', 'Log Friday’s wear', null],
    ]);
    // The phone apps already out see only the kinds they know.
    expect(res.items.map((i) => i.kind)).toEqual(['receipts', 'diary', 'diary', 'diary']);
    expect(res.cards.every((c) => !c.seen)).toBe(true);
  });

  it('says Start at no answers; leaves once the five are answered', async () => {
    Object.assign(profile, {
      genderIdentity: null,
      ageBand: null,
      investmentLevel: null,
      styleArchetypes: [],
      styleBrands: [],
    });
    const first = await loadNotifications(ann, now);
    expect(first.cards[0]).toMatchObject({
      kind: 'dna',
      text: 'Start your Style DNA',
      section: 'gender',
    });
    Object.assign(profile, done);
    expect((await loadNotifications(ann, now)).cards).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ kind: 'dna' })]),
    );
  });

  it('never asks for a twin again once she has had one, and remembers that she has', async () => {
    repos.uiState.bell.mockResolvedValue({ seenAt: null, cards: { ...cards, twinHad: false } });
    repos.model.get.mockResolvedValue(twin);
    expect((await loadNotifications(ann, now)).cards.map((c) => c.kind)).not.toContain('twin');
    expect(repos.uiState.markTwinHad).toHaveBeenCalledWith(ann);
    expect(capture).toHaveBeenCalledWith(ann, 'twin_created');
    // Deleted since: no twin on file, but she has had one.
    repos.model.get.mockResolvedValue(undefined);
    repos.uiState.bell.mockResolvedValue({ seenAt: null, cards });
    expect((await loadNotifications(ann, now)).cards.map((c) => c.kind)).not.toContain('twin');
  });

  it('comes back once a week after it was put away, as round two; a swipe moves its round', async () => {
    repos.model.get.mockResolvedValue(undefined);
    repos.uiState.bell.mockResolvedValue({
      seenAt: new Date('2026-11-01T10:00:00Z'),
      cards: { twinHad: false, twin: { n: 1, at: '2026-10-30T09:00:00Z' }, dna: null },
    });
    expect((await loadNotifications(ann, now)).cards.map((c) => c.kind)).not.toContain('twin');
    const later = new Date('2026-11-06T09:00:00Z');
    const back = (await loadNotifications(ann, later)).cards[0];
    // Back after she last opened the bell, so it lights the dot.
    expect(back).toMatchObject({ kind: 'twin', key: 'twin:2', seen: false });
    await dismissNotification(ann, { key: 'twin:2' }, later);
    expect(repos.uiState.putAwayCard).toHaveBeenCalledWith(ann, 'twin', 2, later);
    expect(repos.uiState.dismiss).not.toHaveBeenCalled();
  });

  it('lights the dot only for what appeared after she last opened the sheet', async () => {
    repos.uiState.bell.mockResolvedValue({ seenAt: new Date('2026-11-01T12:00:00Z'), cards });
    repos.inbox.listHeld.mockResolvedValue([{ retailer: 'COS', receivedAt: now }]);
    const res = await loadNotifications(ann, now);
    expect(res.cards.map((c) => [c.key, c.seen])).toEqual([
      ['receipts:1', false],
      // Sunday's nudge appeared on Monday, after she looked on Sunday.
      ['diary:2026-11-01', false],
      ['diary:2026-10-31', true],
      ['diary:2026-10-30', true],
    ]);
    await markBellSeen(ann, now);
    expect(repos.uiState.markBellSeen).toHaveBeenCalledWith(ann, now);
  });
});

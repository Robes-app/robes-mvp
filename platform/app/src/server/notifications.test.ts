import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const profile = {
  timezone: 'Europe/Dublin',
  createdAt: new Date('2026-10-20T10:00:00Z'),
};
const repos = {
  profiles: { get: vi.fn(async () => profile) },
  inbox: { list: vi.fn(async () => ({ items: [] as { retailer: string | null }[] })) },
  looks: { wornDays: vi.fn(async () => [] as string[]), count: vi.fn(async () => 3) },
  uiState: { dismissed: vi.fn(async () => ({}) as Record<string, string>), dismiss: vi.fn() },
};
vi.mock('./db', () => ({ repos }));

const { loadNotifications, dismissNotification } = await import('./notifications');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');
// Monday 2 November 2026, 09:00 in Dublin.
const now = new Date('2026-11-02T09:00:00Z');

beforeEach(() => {
  repos.inbox.list.mockResolvedValue({ items: [] });
  repos.looks.wornDays.mockResolvedValue([]);
  repos.looks.count.mockResolvedValue(3);
  repos.uiState.dismissed.mockResolvedValue({});
});

describe('the bell', () => {
  it('lists receipts to review, then the unlogged days of the last week, newest first', async () => {
    repos.inbox.list.mockResolvedValue({ items: [{ retailer: 'Arket' }, { retailer: 'COS' }] });
    repos.looks.wornDays.mockResolvedValue(['2026-10-31', '2026-11-01']);
    const { items } = await loadNotifications(ann, now);
    expect(items.map((i) => [i.key, i.text, i.line, i.date])).toEqual([
      ['receipts:2', '2 receipts to review', 'From Arket and COS', null],
      ['diary:2026-10-30', 'Log Friday’s wear', 'Nothing filed for the 30th', '2026-10-30'],
      ['diary:2026-10-29', 'Log Thursday’s wear', 'Nothing filed for the 29th', '2026-10-29'],
      ['diary:2026-10-28', 'Log Wednesday’s wear', 'Nothing filed for the 28th', '2026-10-28'],
      ['diary:2026-10-27', 'Log Tuesday’s wear', 'Nothing filed for the 27th', '2026-10-27'],
      ['diary:2026-10-26', 'Log Monday’s wear', 'Nothing filed for the 26th', '2026-10-26'],
    ]);
    expect(repos.looks.wornDays).toHaveBeenCalledWith(ann, '2026-10-26', '2026-11-02');
  });

  it('keeps what she dismissed away, and asks for nothing before she has a look', async () => {
    repos.uiState.dismissed.mockResolvedValue({ 'diary:2026-11-01': '2026-11-02T08:00:00Z' });
    const { items } = await loadNotifications(ann, now);
    expect(items.map((i) => i.key)).not.toContain('diary:2026-11-01');
    expect(items).toHaveLength(6);
    repos.looks.count.mockResolvedValue(0);
    expect((await loadNotifications(ann, now)).items).toEqual([]);
    await dismissNotification(ann, 'receipts:1');
    expect(repos.uiState.dismiss).toHaveBeenCalledWith(ann, 'receipts:1');
  });
});

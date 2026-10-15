import { NotAdmin, verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const repos = { adminReads: { metrics: vi.fn() } };
vi.mock('./db', () => ({ repos }));
vi.mock('./flags', () => ({ invalidateFlag: vi.fn() }));

const admin = await import('./admin');
const actor = { admin: verifiedUserId('11111111-1111-4111-8111-111111111111'), ip: '1.2.3.4' };
const empty = {
  daily: [{ day: '2026-10-15', signups: 1, active: 2 }],
  funnel: { signedUp: 1, firstPiece: 1, firstSavedLook: 0, returned: 0 },
  piecesBySource: [],
  looksBySource: [],
  deck: { kept: 0, edited: 0, passed: 0, waiting: 0 },
  jobs: [
    {
      kind: 'look_ask',
      total: 3,
      succeeded: 2,
      failed: 1,
      cancelled: 0,
      p50Ms: 900,
      p95Ms: 1800,
      costMicros: 40,
    },
  ],
  queue: { queued: 0, running: 0, oldestQueuedSeconds: null, staleQueued: 0, expiredLeases: 0 },
  email: { sent: 0, failed: 0, suppressed: 0, bounces: 0, complaints: 0, unsubscribes: 0 },
};

beforeEach(() => vi.clearAllMocks());

describe('admin metrics', () => {
  it('lists every job kind, the new ones at zero when idle, busiest first', async () => {
    repos.adminReads.metrics.mockResolvedValue(empty);
    const m = await admin.metrics(actor, 7);
    expect(m.days).toBe(7);
    expect(m.jobs[0]).toMatchObject({ kind: 'look_ask', total: 3 });
    const kinds = m.jobs.map((j) => j.kind);
    for (const k of ['style_brief', 'wardrobe_pieces', 'look_render:frame', 'avatar_cell']) {
      expect(kinds).toContain(k);
    }
    expect(kinds).not.toContain('fake');
    expect(kinds.filter((k) => k === 'look_ask')).toHaveLength(1);
  });

  it('answers 403 when the repository finds the caller is not an admin', async () => {
    repos.adminReads.metrics.mockRejectedValue(new NotAdmin());
    await expect(admin.metrics(actor, 7)).rejects.toMatchObject({ code: 'forbidden' });
  });
});

import { NotAdmin, verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const repos = {
  adminReads: { metrics: vi.fn(), userRecords: vi.fn(), generationCall: vi.fn() },
};
vi.mock('./db', () => ({ repos }));
vi.mock('./flags', () => ({ invalidateFlag: vi.fn() }));
vi.mock('./media', () => ({
  mediaDelivery: { url: async (key: string) => `https://media.test/${key}?sig=1` },
}));

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

const uid = '22222222-2222-4222-8222-222222222222';
const pid = '33333333-3333-4333-8333-333333333333';
const at = new Date('2026-10-20T10:00:00Z');
const noRows = {
  pieceCount: 1,
  wishlist: [],
  looks: [],
  artifacts: [],
  feedback: [],
  memory: [],
  brief: [],
  notifications: [],
  inbox: [],
  calls: [],
  events: [],
};

describe('admin user records', () => {
  it('signs the narrowest rendition of her photo, and none for a photo still processing', async () => {
    const piece = {
      id: pid,
      label: 'Camel coat',
      category: 'Outerwear',
      brand: null,
      colourShade: 'camel',
      material: 'wool',
      status: 'active',
      acquiredVia: 'photo',
      heroPosition: 1,
      wears: '3',
      createdAt: at,
    };
    repos.adminReads.userRecords.mockResolvedValue({
      ...noRows,
      pieces: [
        {
          ...piece,
          image: {
            id: pid,
            status: 'ready',
            renditions: { v: 1, master: { width: 1600, height: 2000 }, widths: [640, 320] },
          },
        },
        { ...piece, id: uid, image: { id: uid, status: 'pending', renditions: {} } },
      ],
    });
    const r = await admin.userRecords(actor, uid);
    expect(r.pieces[0]).toMatchObject({ hero: true, wears: 3, material: 'wool' });
    expect(r.pieces[0]?.image).toMatch(/^https:\/\/media\.test\/.*320.*\.webp\?sig=1$/);
    expect(r.pieces[0]?.image).toContain(uid);
    expect(r.pieces[1]?.image).toBeNull();
  });

  it('answers 404 for no such user, and 403 when the caller is not an admin', async () => {
    repos.adminReads.userRecords.mockResolvedValue(undefined);
    await expect(admin.userRecords(actor, uid)).rejects.toMatchObject({ code: 'not_found' });
    repos.adminReads.generationCall.mockRejectedValue(new NotAdmin());
    await expect(admin.generationCall(actor, uid)).rejects.toMatchObject({ code: 'forbidden' });
  });
});

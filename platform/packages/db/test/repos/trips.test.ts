import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { styling } = createSystemRepositories(db);
let niall: UserId;
let bea: UserId;
let shirt: string;
let beasShoe: string;

async function newTrip(user: UserId): Promise<string> {
  const job = await repos.jobs.create(user, { kind: 'travel', input: {} });
  return styling.createTrip(user, {
    jobId: job.job.id,
    title: 'LISBON · OCTOBER',
    subtitle: 'Three days in Lisbon.',
    data: { v: 1 },
  });
}

beforeAll(async () => {
  niall = await createTestUser(db, 'Niall Trips');
  bea = await createTestUser(db, 'Bea Trips');
  shirt = (await repos.wardrobe.create(niall, { label: 'Linen shirt' })).id;
  beasShoe = (await repos.wardrobe.create(bea, { label: 'Loafers' })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, niall, bea);
  await db.destroy();
});

describe('trips repo', () => {
  it('keeps trips saved and private to their owner', async () => {
    const id = await newTrip(niall);
    const trip = await repos.trips.get(niall, id);
    expect(trip?.title).toBe('LISBON · OCTOBER');
    const row = await db
      .selectFrom('artifacts')
      .select(['savedAt', 'expiresAt'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    expect(row.savedAt).toBeInstanceOf(Date);
    expect(row.expiresAt).toBeNull();
    expect(await repos.trips.get(bea, id)).toBeUndefined();
    expect((await repos.trips.list(niall)).map((t) => t.id)).toContain(id);
    expect(await repos.trips.remove(bea, id)).toBe(false);
    expect(await repos.trips.pin(bea, id, [])).toBeUndefined();
  });

  it('pins each look to its day once, with only her own pieces', async () => {
    const id = await newTrip(niall);
    const looks = [
      {
        date: '2026-10-02',
        name: 'Golden Hour',
        note: 'Linen over silk.',
        pieceIds: [shirt, beasShoe],
      },
      { date: '2026-10-03', name: 'Harbour Dinner', note: '', pieceIds: [] },
    ];
    const first = await repos.trips.pin(niall, id, looks);
    const again = await repos.trips.pin(niall, id, looks);
    expect(first).toHaveLength(2);
    expect(again).toEqual(first);
    const plan = await repos.plan.range(niall, '2026-10-01', '2026-10-05');
    expect(plan.map((p) => [p.dayDate, p.lookId])).toEqual([
      ['2026-10-02', first?.[0]],
      ['2026-10-03', first?.[1]],
    ]);
    const pieces = await repos.looks.piecesFor(niall, [first?.[0] ?? '']);
    expect(pieces.map((p) => p.id)).toEqual([shirt]);
    expect((await repos.looks.get(niall, first?.[0] ?? ''))?.source).toBe('travel');
  });

  it('soft deletes and restores', async () => {
    const id = await newTrip(niall);
    expect(await repos.trips.remove(niall, id)).toBe(true);
    expect(await repos.trips.get(niall, id)).toBeUndefined();
    expect(await repos.trips.restore(niall, id)).toBe(true);
    expect(await repos.trips.get(niall, id)).toBeDefined();
  });
});

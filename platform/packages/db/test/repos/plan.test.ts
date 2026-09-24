import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { plan, looks, wardrobe } = createRepositories(db);
let ann: UserId;
let bea: UserId;
let lookId: string;
let other: string;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
  const coat = (await wardrobe.create(ann, { label: 'Camel coat' })).id;
  lookId = (
    await looks.create(ann, { name: 'Office', nameProvisional: false, pieces: [{ pieceId: coat }] })
  ).id;
  other = (await looks.create(ann, { name: 'Dinner', nameProvisional: false, pieces: [] })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('plan repo', () => {
  it('pins a look to many days once each, as calendar dates, day before evening', async () => {
    const ids = await plan.pin(ann, lookId, ['2026-10-01', '2026-10-02'], { slot: 'day' });
    const again = await plan.pin(ann, lookId, ['2026-10-01'], { slot: 'day' });
    expect(again?.[0]).toBe(ids?.[0]);
    await plan.pin(ann, other, ['2026-10-01'], { slot: 'evening', activity: 'Dinner at Ada' });
    const rows = await plan.range(ann, '2026-10-01', '2026-10-31');
    expect(rows.map((r) => [r.dayDate, r.slot, r.lookId])).toEqual([
      ['2026-10-01', 'day', lookId],
      ['2026-10-01', 'evening', other],
      ['2026-10-02', 'day', lookId],
    ]);
    expect(await plan.range(ann, '2026-10-03', '2026-10-31')).toEqual([]);
  });

  it('keeps plans private and refuses looks she does not own', async () => {
    expect(await plan.pin(bea, lookId, ['2026-10-05'], { slot: 'day' })).toBeUndefined();
    expect(await plan.range(bea, '2026-01-01', '2026-12-31')).toEqual([]);
    const [id] = (await plan.pin(ann, lookId, ['2026-10-06'], { slot: 'day' })) ?? [];
    expect(await plan.get(bea, id ?? '')).toBeUndefined();
    expect(await plan.update(bea, id ?? '', { activity: 'Mine' })).toBeUndefined();
    expect(await plan.remove(bea, id ?? '')).toBe(false);
  });

  it('renames, unpins and undoes; a deleted look leaves the plan', async () => {
    const [id] = (await plan.pin(ann, lookId, ['2026-10-07'], { slot: 'day' })) ?? [];
    expect((await plan.update(ann, id ?? '', { activity: 'Board meeting' }))?.activity).toBe(
      'Board meeting',
    );
    expect(await plan.remove(ann, id ?? '')).toBe(true);
    expect(await plan.range(ann, '2026-10-07', '2026-10-07')).toEqual([]);
    expect(await plan.restore(ann, id ?? '')).toBe(true);
    expect(await plan.range(ann, '2026-10-07', '2026-10-07')).toHaveLength(1);
    await looks.remove(ann, lookId);
    expect(await plan.range(ann, '2026-10-07', '2026-10-07')).toEqual([]);
    await looks.restore(ann, lookId);
  });
});

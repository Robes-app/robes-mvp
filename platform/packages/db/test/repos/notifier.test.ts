import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { notifier } = createSystemRepositories(db);
let ann: UserId;

beforeAll(async () => {
  ann = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann);
  await db.destroy();
});

describe('notifier state', () => {
  it('leaves trip-placed looks off the planned days while trips are hidden', async () => {
    const office = await repos.looks.create(ann, {
      name: 'Office',
      nameProvisional: false,
      pieces: [],
    });
    const beach = await repos.looks.create(ann, {
      name: 'Beach',
      nameProvisional: false,
      pieces: [],
    });
    await db.updateTable('looks').set({ source: 'travel' }).where('id', '=', beach.id).execute();
    await repos.plan.pin(ann, office.id, ['2026-10-20'], { slot: 'day' });
    await repos.plan.pin(ann, beach.id, ['2026-10-21'], { slot: 'day' });
    const window = { from: '2026-10-19', to: '2026-10-25' };
    const all = await notifier.state([ann], window);
    expect(all.plan.map((p) => p.lookName).sort()).toEqual(['Beach', 'Office']);
    const hidden = await notifier.state([ann], window, { hideTravel: true });
    expect(hidden.plan.map((p) => p.lookName)).toEqual(['Office']);
  });
});

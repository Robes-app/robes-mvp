import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { plan, looks, wardrobe } = createRepositories(db);
const { passedPins } = createSystemRepositories(db);
// 00:30 on 12 Nov in Dublin (11 Nov has ended); 16:30 on 11 Nov in Los Angeles (it has not).
const NOW = new Date('2026-11-12T00:30:00Z');
let ann: UserId;
let bea: UserId;
let lost: UserId;
let coat: string;
let office: string;
let dinner: string;

const zone = (id: UserId, timezone: string) =>
  db.updateTable('profiles').set({ timezone }).where('id', '=', id).execute();
const pinOn = async (userId: UserId, lookId: string, day: string) =>
  ((await plan.pin(userId, lookId, [day], { slot: 'day' })) ?? [])[0] ?? '';
const due = (earliest = '2026-11-01') =>
  passedPins.due({ now: NOW, earliest, catchUpDays: 2, limit: 50, userIds: [ann, bea, lost] });
const dueIds = async (earliest?: string) => (await due(earliest)).map((r) => r.id).sort();
const pinRow = (id: string) =>
  db
    .selectFrom('plannedDays')
    .select(['status', 'deletedAt'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
const wearsOf = (userId: UserId, lookId: string) =>
  db
    .selectFrom('wears')
    .select(['pieceIds', 'source', sql<string>`worn_on::text`.as('wornOn')])
    .where('userId', '=', userId)
    .where('lookId', '=', lookId)
    .orderBy('wornOn')
    .execute();

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
  lost = await createTestUser(db);
  await zone(ann, 'Europe/Dublin');
  await zone(bea, 'America/Los_Angeles');
  await zone(lost, 'Not/AZone');
  coat = (await wardrobe.create(ann, { label: 'Camel coat' })).id;
  office = (
    await looks.create(ann, { name: 'Office', nameProvisional: false, pieces: [{ pieceId: coat }] })
  ).id;
  dinner = (await looks.create(ann, { name: 'Dinner', nameProvisional: false, pieces: [] })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea, lost);
  await db.destroy();
});

describe('passed pins (D23)', () => {
  it('finds only live planned pins on days that have ended in her timezone, in the window', async () => {
    const yesterday = await pinOn(ann, office, '2026-11-11');
    const dayBefore = await pinOn(ann, office, '2026-11-10');
    await pinOn(ann, office, '2026-11-12'); // her today: not over
    await pinOn(ann, office, '2026-11-09'); // before the catch-up window
    const beaLook = (await looks.create(bea, { name: 'Bea', nameProvisional: false, pieces: [] }))
      .id;
    await pinOn(bea, beaLook, '2026-11-11'); // still 11 Nov in Los Angeles
    const lostLook = (
      await looks.create(lost, { name: 'Lost', nameProvisional: false, pieces: [] })
    ).id;
    await pinOn(lost, lostLook, '2026-11-11'); // a zone Postgres does not know: never guessed

    expect(await dueIds()).toEqual([yesterday, dayBefore].sort());
    // Nothing before the day this ships.
    expect(await dueIds('2026-11-11')).toEqual([yesterday]);
    expect((await due()).find((r) => r.id === yesterday)?.userId).toBe(ann);
  });

  it('files the look as worn on its day, its pieces as they stood, once', async () => {
    const pin = await pinOn(ann, dinner, '2026-11-11');
    expect(await passedPins.file(ann, pin)).toBe(true);
    expect(await wearsOf(ann, dinner)).toEqual([
      { pieceIds: [], source: 'plan', wornOn: '2026-11-11' },
    ]);
    expect((await pinRow(pin)).status).toBe('worn');
    const day = await plan.range(ann, '2026-11-11', '2026-11-11');
    expect(day.filter((r) => r.lookId === dinner).map((r) => [r.id, r.worn])).toEqual([
      [pin, true],
    ]);
    // Safe to run twice: nothing is due and filing again changes nothing.
    expect(await dueIds()).not.toContain(pin);
    expect(await passedPins.file(ann, pin)).toBe(false);
    expect(await wearsOf(ann, dinner)).toHaveLength(1);
  });

  it('snapshots the pieces at the time of filing', async () => {
    const pin = await pinOn(ann, office, '2026-11-11');
    expect(await passedPins.file(ann, pin)).toBe(true);
    const [wear] = (await wearsOf(ann, office)).filter((w) => w.wornOn === '2026-11-11');
    expect(wear).toEqual({ pieceIds: [coat], source: 'plan', wornOn: '2026-11-11' });
  });

  it('never files a day she overrode', async () => {
    const shoes = (await wardrobe.create(ann, { label: 'Loafers' })).id;
    const look = (
      await looks.create(ann, {
        name: 'Gallery',
        nameProvisional: false,
        pieces: [{ pieceId: shoes }],
      })
    ).id;
    // The × on a planned pin: unpinned.
    const unpinned = await pinOn(ann, look, '2026-11-10');
    expect(await plan.remove(ann, unpinned)).toBe(true);
    // Filed, then the × on the worn day (or the date in WornView): wear and pin both go.
    const taken = await pinOn(ann, look, '2026-11-11');
    expect(await passedPins.file(ann, taken)).toBe(true);
    expect(await looks.unwear(ann, look, '2026-11-11')).toBe(true);

    const ids = await dueIds();
    expect(ids).not.toContain(unpinned);
    expect(ids).not.toContain(taken);
    expect(await passedPins.file(ann, unpinned)).toBe(false);
    expect(await passedPins.file(ann, taken)).toBe(false);
    expect(await wearsOf(ann, look)).toEqual([]);
    expect((await pinRow(taken)).deletedAt).not.toBeNull();
  });

  it('leaves a deleted look, and a look already worn that day, alone', async () => {
    const gone = (await looks.create(ann, { name: 'Gone', nameProvisional: false, pieces: [] })).id;
    const gonePin = await pinOn(ann, gone, '2026-11-11');
    await looks.remove(ann, gone);
    const worn = (await looks.create(ann, { name: 'Worn', nameProvisional: false, pieces: [] })).id;
    const wornPin = await pinOn(ann, worn, '2026-11-11');
    await looks.wear(ann, worn, '2026-11-11');
    const ids = await dueIds();
    expect(ids).not.toContain(gonePin);
    expect(ids).not.toContain(wornPin);
    expect(await passedPins.file(ann, gonePin)).toBe(false);
    // Her own wear on a pinned day marks that pin worn too: the two are one act.
    expect((await pinRow(wornPin)).status).toBe('worn');
    expect((await wearsOf(ann, worn)).map((w) => w.source)).toEqual(['looks']);
  });

  it('leaves a trip’s looks alone: trips are hidden', async () => {
    const trip = (await looks.create(ann, { name: 'Lisbon', nameProvisional: false, pieces: [] }))
      .id;
    await db.updateTable('looks').set({ source: 'travel' }).where('id', '=', trip).execute();
    const tripPin = await pinOn(ann, trip, '2026-11-11');
    expect(await dueIds()).not.toContain(tripPin);
    expect(await wearsOf(ann, trip)).toEqual([]);
  });

  it('files nothing across users', async () => {
    const pin = await pinOn(ann, office, '2026-11-10');
    expect(await passedPins.file(bea, pin)).toBe(false);
    expect((await pinRow(pin)).status).toBe('planned');
    expect((await wearsOf(ann, office)).map((w) => w.wornOn)).not.toContain('2026-11-10');
  });
});

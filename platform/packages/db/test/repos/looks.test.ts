import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import {
  createRepositories,
  LOOK_IMAGES_MAX,
  LookImagesFull,
  LookPiecesNotFound,
} from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { assets, looks, plan, wardrobe } = createRepositories(db);
let ann: UserId;
let bea: UserId;
let coat: string;
let jeans: string;
let beasShoe: string;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
  coat = (await wardrobe.create(ann, { label: 'Camel coat' })).id;
  jeans = (await wardrobe.create(ann, { label: 'Straight jeans' })).id;
  beasShoe = (await wardrobe.create(bea, { label: 'Loafers' })).id;
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

const create = (user: UserId, pieces: string[], name = 'Weekend') =>
  looks.create(user, {
    name,
    nameProvisional: true,
    pieces: pieces.map((pieceId) => ({ pieceId })),
  });

describe('looks repo', () => {
  it('creates a look with ordered pieces and keeps it to its owner', async () => {
    const look = await create(ann, [jeans, coat]);
    expect(look).toMatchObject({ name: 'Weekend', nameProvisional: true, source: 'manual' });
    const pieces = await looks.piecesFor(ann, [look.id]);
    expect(pieces.map((p) => p.label)).toEqual(['Straight jeans', 'Camel coat']);
    expect(await looks.get(bea, look.id)).toBeUndefined();
    expect((await looks.getMany(ann, [look.id])).map((l) => l.id)).toEqual([look.id]);
    expect(await looks.getMany(bea, [look.id])).toEqual([]);
    expect(await looks.piecesFor(bea, [look.id])).toEqual([]);
    expect(await looks.update(bea, look.id, { name: 'Mine' })).toBeUndefined();
    expect(await looks.remove(bea, look.id)).toBe(false);
  });

  it('refuses pieces she does not own, or the same piece twice, and writes nothing', async () => {
    await expect(create(ann, [coat, beasShoe], 'Borrowed')).rejects.toBeInstanceOf(
      LookPiecesNotFound,
    );
    await expect(create(ann, [coat, coat], 'Twice')).rejects.toBeInstanceOf(LookPiecesNotFound);
    const { items } = await looks.list(ann, { limit: 50 });
    expect(items.map((l) => l.name)).not.toContain('Borrowed');
    expect(items.map((l) => l.name)).not.toContain('Twice');
  });

  it('lists the looks a piece is on, for its owner only', async () => {
    const hat = (await wardrobe.create(ann, { label: 'Felt hat' })).id;
    const withHat = await create(ann, [hat, jeans], 'With the hat');
    await create(ann, [coat], 'Without it');
    const { items } = await looks.list(ann, { limit: 50, pieceId: hat });
    expect(items.map((l) => l.id)).toEqual([withHat.id]);
    expect((await looks.list(bea, { limit: 50, pieceId: hat })).items).toEqual([]);
  });

  it('naming a look makes the name hers; pieces are replaced atomically', async () => {
    const look = await create(ann, [coat]);
    const renamed = await looks.update(ann, look.id, {
      name: 'Gallery opening',
      pieces: [{ pieceId: coat, role: 'anchor' }, { pieceId: jeans }],
    });
    expect(renamed).toMatchObject({ name: 'Gallery opening', nameProvisional: false });
    const pieces = await looks.piecesFor(ann, [look.id]);
    expect(pieces.map((p) => [p.label, p.role])).toEqual([
      ['Camel coat', 'anchor'],
      ['Straight jeans', null],
    ]);
    await expect(
      looks.update(ann, look.id, { pieces: [{ pieceId: beasShoe }] }),
    ).rejects.toBeInstanceOf(LookPiecesNotFound);
    expect((await looks.piecesFor(ann, [look.id])).length).toBe(2);
  });

  it('soft deletes and restores; a deleted piece drops out of the look', async () => {
    const scarf = (await wardrobe.create(ann, { label: 'Scarf' })).id;
    const look = await create(ann, [coat, scarf]);
    await wardrobe.remove(ann, scarf);
    expect((await looks.piecesFor(ann, [look.id])).map((p) => p.label)).toEqual(['Camel coat']);
    expect(await looks.remove(ann, look.id)).toBe(true);
    expect(await looks.get(ann, look.id)).toBeUndefined();
    expect((await looks.restore(ann, look.id))?.id).toBe(look.id);
  });

  it('records one wear per day as a calendar date, and can undo it', async () => {
    const look = await create(ann, [coat, jeans]);
    const first = await looks.wear(ann, look.id, '2026-09-24');
    const again = await looks.wear(ann, look.id, '2026-09-24');
    expect(first).toMatchObject({ wornOn: '2026-09-24', pieceIds: [coat, jeans] });
    expect(again?.id).toBe(first?.id);
    await looks.wear(ann, look.id, '2026-09-20');
    expect(await looks.wearStats(ann, [look.id])).toEqual([
      { lookId: look.id, timesWorn: '2', lastWornOn: '2026-09-24' },
    ]);
    expect(await looks.wear(bea, look.id, '2026-09-24')).toBeUndefined();
    expect(await looks.unwear(ann, look.id, '2026-09-24')).toBe(true);
    expect(await looks.unwear(ann, look.id, '2026-09-24')).toBe(false);
  });

  it('lists the days a look is pinned on from yesterday on, to its owner only', async () => {
    const look = await create(ann, [coat]);
    const day = async (n: number) =>
      (
        await db
          .selectNoFrom(sql<string>`(current_date + ${n}::int)::text`.as('d'))
          .executeTakeFirstOrThrow()
      ).d;
    const [lastWeek, tomorrow, nextWeek] = [await day(-7), await day(1), await day(7)];
    await plan.pin(ann, look.id, [nextWeek, lastWeek, tomorrow], { slot: 'day' });
    expect(await looks.pinnedDays(ann, [look.id])).toEqual([
      { lookId: look.id, dayDate: tomorrow },
      { lookId: look.id, dayDate: nextWeek },
    ]);
    expect(await looks.pinnedDays(bea, [look.id])).toEqual([]);
  });

  it("reads a look's record newest first, naming the pieces the wear itself holds", async () => {
    const belt = (await wardrobe.create(ann, { label: 'Woven belt' })).id;
    const look = await create(ann, [coat, belt], 'The record');
    await looks.wear(ann, look.id, '2026-09-18');
    // The belt leaves the look, so the two wears hold different pieces.
    await looks.update(ann, look.id, { pieces: [{ pieceId: coat }] });
    await looks.wear(ann, look.id, '2026-09-25');
    const record = await looks.wears(ann, look.id);
    expect(record.map((w) => w.wornOn)).toEqual(['2026-09-25', '2026-09-18']);
    expect(record[0]?.pieces.map((p) => p.label)).toEqual(['Camel coat']);
    expect(record[1]?.pieces.map((p) => p.label)).toEqual(['Camel coat', 'Woven belt']);
    // A piece she has let go of still names itself — the record of what she wore stays true.
    await wardrobe.remove(ann, belt);
    const after = await looks.wears(ann, look.id);
    expect(after[1]?.pieces.map((p) => p.label)).toEqual(['Camel coat', 'Woven belt']);
    // A look that is not hers has no record to read.
    expect(await looks.wears(bea, look.id)).toEqual([]);
  });

  const photoOf = (user: UserId) =>
    assets.createPending(user, { kind: 'look_photo', contentType: 'image/jpeg', bytes: 1000 });

  // The image stack (Felix rebuild D13): her photographs, the one in front leading the look.
  it('stacks her photographs behind one another, the first leading as the photograph', async () => {
    const look = await create(ann, [coat], 'Photographed');
    const [one, two] = [await photoOf(ann), await photoOf(ann)];
    expect((await looks.addImage(ann, look.id, one.id))?.photoAssetId).toBe(one.id);
    expect((await looks.addImage(ann, look.id, two.id))?.photoAssetId).toBe(one.id);
    // The same photograph again is the one row.
    await looks.addImage(ann, look.id, two.id);
    expect((await looks.imagesFor(ann, [look.id])).map((i) => [i.assetId, i.position])).toEqual([
      [one.id, 0],
      [two.id, 1],
    ]);
    // Another woman's look is not hers to put a photograph on, and nothing is written.
    expect(await looks.addImage(bea, look.id, one.id)).toBeUndefined();
    expect(await looks.imagesFor(bea, [look.id])).toEqual([]);
    expect((await looks.get(ann, look.id))?.photoAssetId).toBe(one.id);
  });

  it('brings a photograph to the front, or Robes’ picture, and the rest keep their order', async () => {
    const look = await create(ann, [coat], 'Covered');
    const [one, two, three] = [await photoOf(ann), await photoOf(ann), await photoOf(ann)];
    await looks.addImage(ann, look.id, one.id);
    await looks.addImage(ann, look.id, two.id);
    await looks.addImage(ann, look.id, three.id);
    const order = async () => (await looks.imagesFor(ann, [look.id])).map((i) => i.assetId);
    const [, second] = await looks.imagesFor(ann, [look.id]);
    const led = await looks.setCover(ann, look.id, second?.id ?? '');
    expect(led).toMatchObject({ photoAssetId: two.id, recordImage: 'photo' });
    expect(await order()).toEqual([two.id, one.id, three.id]);
    // Robes' picture in front: the photographs stay where they are, behind it.
    const robes = await looks.setCover(ann, look.id, null);
    expect(robes).toMatchObject({ photoAssetId: two.id, recordImage: 'model' });
    expect(await order()).toEqual([two.id, one.id, three.id]);
    // The camera on a look (the old photo route): the new photograph joins and leads.
    const four = await photoOf(ann);
    const taken = await looks.addImage(ann, look.id, four.id, { lead: true });
    expect(taken).toMatchObject({ photoAssetId: four.id, recordImage: 'photo' });
    expect(await order()).toEqual([four.id, two.id, one.id, three.id]);
    // Not hers: nothing leads, nothing is written.
    expect(await looks.setCover(bea, look.id, second?.id ?? '')).toBeUndefined();
    expect(await looks.setCover(ann, look.id, randomUUID())).toBeUndefined();
    expect(await order()).toEqual([four.id, two.id, one.id, three.id]);
  });

  it('lets a photograph go; the rest close up, and none leaves Robes’ picture leading', async () => {
    const look = await create(ann, [coat], 'Thinned');
    const [one, two] = [await photoOf(ann), await photoOf(ann)];
    await looks.addImage(ann, look.id, one.id);
    await looks.addImage(ann, look.id, two.id);
    const [first, second] = await looks.imagesFor(ann, [look.id]);
    expect(await looks.removeImage(bea, look.id, first?.id ?? '')).toBeUndefined();
    expect((await looks.removeImage(ann, look.id, first?.id ?? ''))?.photoAssetId).toBe(two.id);
    expect((await looks.imagesFor(ann, [look.id])).map((i) => [i.id, i.position])).toEqual([
      [second?.id, 0],
    ]);
    await looks.update(ann, look.id, { record: 'photo' });
    const bare = await looks.removeImage(ann, look.id, second?.id ?? '');
    expect(bare).toMatchObject({ photoAssetId: null, recordImage: null });
    expect(await looks.removeImage(ann, look.id, second?.id ?? '')).toBeUndefined();
  });

  it('holds twenty photographs and refuses a twenty-first, writing nothing', async () => {
    const look = await create(ann, [coat], 'Full');
    for (let i = 0; i < LOOK_IMAGES_MAX; i++) {
      await looks.addImage(ann, look.id, (await photoOf(ann)).id);
    }
    await expect(looks.addImage(ann, look.id, (await photoOf(ann)).id)).rejects.toBeInstanceOf(
      LookImagesFull,
    );
    expect((await looks.imagesFor(ann, [look.id])).length).toBe(LOOK_IMAGES_MAX);
  });

  // Seasons (D12): the four seasons she picks, and the band every older reader still sees.
  it('spells the season as seasons and as the band, whichever she sent', async () => {
    const look = await looks.create(ann, {
      name: 'Spring',
      nameProvisional: false,
      pieces: [],
      seasons: ['summer', 'spring', 'spring'],
    });
    expect(look).toMatchObject({ seasons: ['spring', 'summer'], climateBand: 'spring_summer' });
    const banded = await looks.update(ann, look.id, { climateBand: 'autumn_winter' });
    expect(banded).toMatchObject({ seasons: ['autumn', 'winter'], climateBand: 'autumn_winter' });
    const mixed = await looks.update(ann, look.id, {
      seasons: ['winter', 'summer'],
      climateBand: 'spring_summer',
    });
    expect(mixed).toMatchObject({ seasons: ['summer', 'winter'], climateBand: 'year_round' });
    expect((await looks.update(ann, look.id, { seasons: [] }))?.climateBand).toBe('year_round');
  });

  it('keeps which picture is the record, and only she can set it', async () => {
    const look = await create(ann, [coat]);
    expect(look.recordImage).toBeNull();
    expect((await looks.update(ann, look.id, { record: 'model' }))?.recordImage).toBe('model');
    expect(await looks.update(bea, look.id, { record: 'photo' })).toBeUndefined();
    expect((await looks.get(ann, look.id))?.recordImage).toBe('model');
    // Saying which picture leads is not a change to the rack: a saved look stays saved.
    expect((await looks.get(ann, look.id))?.status).toBe('saved');
  });

  it('counts her looks and the looks she wore on a day', async () => {
    const user = await createTestUser(db);
    const a = await looks.create(user, { name: 'A', nameProvisional: false, pieces: [] });
    await looks.create(user, { name: 'B', nameProvisional: false, pieces: [] });
    expect(await looks.count(user)).toBe(2);
    await looks.wear(user, a.id, '2026-10-01');
    expect(await looks.wornOn(user, '2026-10-01')).toEqual([a.id]);
    expect(await looks.wornOn(user, '2026-10-02')).toEqual([]);
    expect(await looks.wornOn(bea, '2026-10-01')).toEqual([]);
    expect(await looks.count(bea)).toBe(0);
    await deleteTestUsers(db, user);
  });

  it('pages newest first', async () => {
    const user = await createTestUser(db);
    for (const [i, name] of ['A', 'B', 'C'].entries()) {
      const look = await looks.create(user, { name, nameProvisional: true, pieces: [] });
      // Distinct instants, so the order under test is created_at and not the id tiebreak.
      await db
        .updateTable('looks')
        .set({ createdAt: sql`now() - make_interval(secs => ${10 - i})` })
        .where('id', '=', look.id)
        .execute();
    }
    const first = await looks.list(user, { limit: 2 });
    const second = await looks.list(user, { limit: 2, cursor: first.nextCursor ?? undefined });
    expect([...first.items, ...second.items].map((l) => l.name)).toEqual(['C', 'B', 'A']);
    expect(second.nextCursor).toBeNull();
    await deleteTestUsers(db, user);
  });
});

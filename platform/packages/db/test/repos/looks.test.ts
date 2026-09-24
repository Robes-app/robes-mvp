import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, LookPiecesNotFound } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { looks, wardrobe } = createRepositories(db);
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

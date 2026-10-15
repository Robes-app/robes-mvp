import { MAX_DRAFTS } from '@robes/core/looks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import {
  createRepositories,
  createSystemRepositories,
  DraftsFull,
  LookPiecesNotFound,
} from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { looks, wardrobe, plan } = createRepositories(db);
const system = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;
let dress: string;
let boots: string;
let bag: string;
let beasCoat: string;
let setId: string;

async function newSet(user: UserId): Promise<string> {
  const row = await db
    .insertInto('artifacts')
    .values({ userId: user, type: 'idea', title: 'Rust dress' })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

const proposal = {
  key: 'p-aaaa1111',
  name: 'Black pointed mules',
  category: 'Shoes',
  color: 'black',
  brand: 'Toteme',
  retailerHint: 'toteme.com',
  pricePoint: '€390',
  role: 'exclamation',
  wishlisted: false,
};

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
  dress = (await wardrobe.create(ann, { label: 'Rust slip dress' })).id;
  boots = (await wardrobe.create(ann, { label: 'Black sock boots' })).id;
  bag = (await wardrobe.create(ann, { label: 'Woven tote' })).id;
  beasCoat = (await wardrobe.create(bea, { label: 'Her coat' })).id;
  setId = await newSet(ann);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('suggested looks (look states)', () => {
  it('mints a set as suggestions, kept apart from saved readers and from other users', async () => {
    const ids = await system.suggested.mintSet(ann, setId, [
      {
        setIndex: 0,
        name: 'Garden party',
        note: 'A long lunch in the sun.',
        pieces: [
          { pieceId: dress, role: 'anchor' },
          { pieceId: beasCoat, role: 'texture' },
        ],
        proposals: [proposal],
        anchorPieceId: dress,
        dateHint: '2026-10-17',
      },
      {
        setIndex: 1,
        name: 'City dinner',
        note: null,
        pieces: [{ pieceId: dress, role: 'anchor' }],
        proposals: [],
        anchorPieceId: beasCoat,
        dateHint: null,
      },
    ]);
    expect(ids).toHaveLength(2);
    const set = await looks.listSet(ann, setId);
    expect(set.map((l) => [l.name, l.status, l.setIndex])).toEqual([
      ['Garden party', 'suggested', 0],
      ['City dinner', 'suggested', 1],
    ]);
    expect(set[0]).toMatchObject({ anchorPieceId: dress, dateHint: '2026-10-17' });
    expect(set[0]?.proposals).toEqual([proposal]);
    // Someone else's piece never lands, as a piece or as the anchor.
    expect(set[1]?.anchorPieceId).toBeNull();
    const pieces = await looks.piecesFor(ann, ids);
    expect(pieces.map((p) => p.label)).toEqual(['Rust slip dress', 'Rust slip dress']);

    expect((await looks.list(ann, { limit: 50 })).items.map((l) => l.id)).not.toContain(ids[0]);
    expect(await looks.count(ann)).toBe(0);
    expect(await looks.count(ann, 'suggested')).toBe(2);
    const suggested = await looks.list(ann, { limit: 50, status: 'suggested' });
    expect(suggested.items.map((l) => l.id).sort()).toEqual([...ids].sort());
    const around = await looks.list(ann, { limit: 50, status: 'suggested', anchorPieceId: dress });
    expect(around.items.map((l) => l.name)).toEqual(['Garden party']);

    expect(await looks.listSet(bea, setId)).toEqual([]);
    expect(await looks.list(bea, { limit: 50, status: 'suggested' })).toMatchObject({ items: [] });
    await expect(system.suggested.mintSet(bea, setId, [])).resolves.toEqual([]);
  });

  it('a suggestion never gathers wears or a day until it is saved', async () => {
    const [id] = await system.suggested.mintSet(ann, setId, [
      {
        setIndex: 2,
        name: 'Off duty',
        note: null,
        pieces: [{ pieceId: boots, role: 'exclamation' }],
        proposals: [],
        anchorPieceId: null,
        dateHint: null,
      },
    ]);
    if (!id) throw new Error('no look');
    expect(await looks.wear(ann, id, '2026-10-15')).toBeUndefined();
    expect(await plan.pin(ann, id, ['2026-10-16'], { slot: 'day' })).toBeUndefined();
    expect(await looks.save(bea, id)).toBeUndefined();
    const saved = await looks.save(ann, id);
    expect(saved).toMatchObject({ status: 'saved', edits: null, nameProvisional: true });
    expect(await looks.count(ann)).toBe(1);
    expect(await looks.wear(ann, id, '2026-10-15')).toMatchObject({ lookId: id });
    expect(await plan.pin(ann, id, ['2026-10-16'], { slot: 'day' })).toHaveLength(1);
    // Saved never goes back.
    expect(await looks.update(ann, id, { pieces: [{ pieceId: bag }] })).toMatchObject({
      status: 'saved',
    });
  });

  it('a suggestion becomes a draft the moment its rack changes', async () => {
    const [id] = await system.suggested.mintSet(ann, await newSet(ann), [
      {
        setIndex: 0,
        name: 'Weekend',
        note: null,
        pieces: [{ pieceId: dress, role: 'anchor' }],
        proposals: [proposal],
        anchorPieceId: dress,
        dateHint: null,
      },
    ]);
    if (!id) throw new Error('no look');
    expect(await looks.update(ann, id, { note: 'Sunday' })).toMatchObject({ status: 'suggested' });
    const draft = await looks.update(ann, id, {
      pieces: [{ pieceId: dress, role: 'anchor' }, { pieceId: boots }],
      styling: { [boots]: 'worn under the hem' },
      edits: { [boots]: { was: { key: 'p-aaaa1111', name: 'Black pointed mules' } } },
    });
    expect(draft).toMatchObject({
      status: 'draft',
      styling: { [boots]: 'worn under the hem' },
      edits: { [boots]: { was: { key: 'p-aaaa1111', name: 'Black pointed mules' } } },
    });
    const saved = await looks.save(ann, id, { name: 'My weekend' });
    expect(saved).toMatchObject({
      status: 'saved',
      name: 'My weekend',
      nameProvisional: false,
      edits: null,
      styling: { [boots]: 'worn under the hem' },
    });
    // A saved look never carries working notes.
    expect(await looks.update(ann, id, { edits: { x: { back: true } } })).toMatchObject({
      edits: null,
    });
  });

  it('re-writes a suggestion in place (↻), never a saved look or another user’s', async () => {
    const [id] = await system.suggested.mintSet(ann, await newSet(ann), [
      {
        setIndex: 1,
        name: 'Before',
        note: null,
        pieces: [{ pieceId: dress, role: 'anchor' }],
        proposals: [],
        anchorPieceId: dress,
        dateHint: null,
      },
    ]);
    if (!id) throw new Error('no look');
    const spec = {
      name: 'After',
      note: 'Rewritten.',
      pieces: [{ pieceId: bag, role: 'exclamation' as const }],
      proposals: [proposal],
    };
    expect(await system.suggested.rewrite(bea, id, spec)).toBe(false);
    expect(await system.suggested.rewrite(ann, id, spec)).toBe(true);
    const row = await looks.get(ann, id);
    expect(row).toMatchObject({ name: 'After', note: 'Rewritten.', frameAssetId: null });
    expect((await looks.piecesFor(ann, [id])).map((p) => p.label)).toEqual(['Woven tote']);
    await looks.save(ann, id);
    expect(await system.suggested.rewrite(ann, id, spec)).toBe(false);
    const read = await system.suggested.look(ann, id);
    expect(read?.pieces.map((p) => p.label)).toEqual(['Woven tote']);
    expect(await system.suggested.look(bea, id)).toBeUndefined();
  });

  it('lands a frame only for the rack it was drawn for', async () => {
    const [id] = await system.suggested.mintSet(ann, await newSet(ann), [
      {
        setIndex: 0,
        name: 'Frame',
        note: null,
        pieces: [{ pieceId: dress, role: 'anchor' }],
        proposals: [],
        anchorPieceId: dress,
        dateHint: null,
      },
    ]);
    if (!id) throw new Error('no look');
    const asset = await db
      .insertInto('assets')
      .values({ userId: ann, kind: 'generated', contentType: 'image/png', provider: 's3' })
      .returning('id')
      .executeTakeFirstOrThrow();
    expect(await looks.claimRender(ann, id, 'frame:k1')).toBe(true);
    expect(await system.suggested.setFrame(ann, id, 'k0', asset.id)).toBe(false);
    expect(await system.suggested.setFrame(bea, id, 'k1', asset.id)).toBe(false);
    expect(await system.suggested.setFrame(ann, id, 'k1', asset.id)).toBe(true);
    expect(await looks.get(ann, id)).toMatchObject({ frameAssetId: asset.id, frameKey: 'k1' });
  });
});

describe('drafts', () => {
  it('holds up to five, then lets the oldest go only when she says so', async () => {
    const owner = await createTestUser(db);
    const shoe = (await wardrobe.create(owner, { label: 'Loafer' })).id;
    const make = (name: string, letGoOldest = false) =>
      looks.create(owner, {
        name,
        nameProvisional: true,
        pieces: [{ pieceId: shoe }],
        status: 'draft',
        letGoOldest,
        edits: { [shoe]: { back: true } },
      });
    const first = await make('Draft 1');
    expect(first).toMatchObject({ status: 'draft', edits: { [shoe]: { back: true } } });
    for (let i = 2; i <= MAX_DRAFTS; i += 1) await make(`Draft ${i}`);
    await expect(make('Draft 6')).rejects.toBeInstanceOf(DraftsFull);
    await make('Draft 6', true);
    const drafts = await looks.list(owner, { limit: 50, status: 'draft' });
    expect(drafts.items).toHaveLength(MAX_DRAFTS);
    expect(drafts.items.map((d) => d.name)).not.toContain('Draft 1');
    expect(await looks.count(owner)).toBe(0);
    await expect(
      looks.create(owner, {
        name: 'Hers',
        nameProvisional: true,
        pieces: [],
        anchorPieceId: beasCoat,
      }),
    ).rejects.toBeInstanceOf(LookPiecesNotFound);
    await deleteTestUsers(db, owner);
  });

  it('keeps a draft’s proposals and saves as hers', async () => {
    const look = await looks.create(ann, {
      name: 'Monday',
      nameProvisional: true,
      pieces: [{ pieceId: dress }],
      proposals: [proposal],
      status: 'draft',
    });
    expect(look).toMatchObject({ status: 'draft', proposals: [proposal] });
    expect(await looks.get(bea, look.id)).toBeUndefined();
    expect(await looks.update(bea, look.id, { proposals: [] })).toBeUndefined();
    const cleared = await looks.update(ann, look.id, { proposals: [] });
    expect(cleared?.proposals).toBeNull();
  });
});

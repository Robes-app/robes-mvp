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
const CLAIM = { frameKey: 'k2', jobId: '00000000-0000-4000-8000-000000000000' };
const { looks, wardrobe, plan, jobs } = createRepositories(db);
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
    expect(await system.suggested.rewrite(bea, id, spec, CLAIM)).toBe(false);
    expect(await system.suggested.rewrite(ann, id, spec, CLAIM)).toBe(true);
    const row = await looks.get(ann, id);
    // Its next frame is claimed in the same write: nobody else asks for it meanwhile.
    expect(row).toMatchObject({
      name: 'After',
      note: 'Rewritten.',
      frameAssetId: null,
      renderKey: 'frame:k2',
      renderStatus: 'pending',
    });
    expect(await looks.claimFrame(ann, id, 'k2')).toBe(false);
    expect((await looks.piecesFor(ann, [id])).map((p) => p.label)).toEqual(['Woven tote']);
    await looks.save(ann, id);
    expect(await system.suggested.rewrite(ann, id, spec, CLAIM)).toBe(false);
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
    expect(await looks.claimFrame(ann, id, 'k0')).toBe(true);
    // A newer rack takes over a claim still drawing an older one; the older frame can't land.
    expect(await looks.claimFrame(ann, id, 'k1')).toBe(true);
    expect(await looks.claimFrame(ann, id, 'k1')).toBe(false);
    expect(await system.suggested.setFrame(ann, id, 'k0', asset.id)).toBe(false);
    expect(await system.suggested.setFrame(bea, id, 'k1', asset.id)).toBe(false);
    expect(await system.suggested.setFrame(ann, id, 'k1', asset.id)).toBe(true);
    expect(await looks.get(ann, id)).toMatchObject({ frameAssetId: asset.id, frameKey: 'k1' });
    expect(await looks.claimFrame(ann, id, 'k1')).toBe(false);
    expect(await looks.claimFrame(bea, id, 'k3')).toBe(false);
  });

  it('claims the frame its own job draws when the set is minted', async () => {
    const jobId = (
      await db
        .insertInto('generationJobs')
        .values({ userId: ann, kind: 'key_piece' })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;
    const spec = (setIndex: number) => ({
      setIndex,
      name: `Way ${setIndex}`,
      note: null,
      pieces: [{ pieceId: dress, role: 'anchor' as const }],
      proposals: [],
      anchorPieceId: dress,
      dateHint: null,
    });
    const [hero, second] = await system.suggested.mintSet(
      ann,
      await newSet(ann),
      [spec(0), spec(1)],
      {
        setIndex: 0,
        frameKey: 'hero',
        jobId,
      },
    );
    expect(await looks.get(ann, hero ?? '')).toMatchObject({
      renderKey: 'frame:hero',
      renderStatus: 'pending',
    });
    expect((await looks.renderState(ann, hero ?? ''))?.renderJobId).toBe(jobId);
    expect(await looks.get(ann, second ?? '')).toMatchObject({ renderKey: null });
    // A client asking for the hero meanwhile is handed the job already drawing it.
    expect(await looks.claimFrame(ann, hero ?? '', 'hero')).toBe(false);
  });
});

describe('drafts', () => {
  it('editing a suggestion, or restoring a draft, counts against the five', async () => {
    const owner = await createTestUser(db);
    const shoe = (await wardrobe.create(owner, { label: 'Loafer' })).id;
    for (let i = 0; i < MAX_DRAFTS; i += 1) {
      await looks.create(owner, {
        name: `D${i}`,
        nameProvisional: true,
        pieces: [],
        status: 'draft',
      });
    }
    const [sugg] = await system.suggested.mintSet(owner, await newSet(owner), [
      {
        setIndex: 0,
        name: 'S',
        note: null,
        pieces: [{ pieceId: shoe, role: null }],
        proposals: [],
        anchorPieceId: null,
        dateHint: null,
      },
    ]);
    if (!sugg) throw new Error('no look');
    // A note doesn't make a draft; a rack change does, within the cap.
    expect(await looks.update(owner, sugg, { note: 'x' })).toMatchObject({ status: 'suggested' });
    await expect(looks.update(owner, sugg, { pieces: [] })).rejects.toBeInstanceOf(DraftsFull);
    expect(await looks.get(owner, sugg)).toMatchObject({ status: 'suggested' });
    expect(await looks.update(owner, sugg, { pieces: [], letGoOldest: true })).toMatchObject({
      status: 'draft',
    });
    expect(await looks.count(owner, 'draft')).toBe(MAX_DRAFTS);
    // The draft let go can't come back over the cap.
    const gone = await db
      .selectFrom('looks')
      .select('id')
      .where('userId', '=', owner)
      .where('deletedAt', 'is not', null)
      .executeTakeFirstOrThrow();
    await expect(looks.restore(owner, gone.id)).rejects.toBeInstanceOf(DraftsFull);
    expect(await looks.restore(owner, gone.id, { letGoOldest: true })).toMatchObject({
      id: gone.id,
    });
    expect(await looks.count(owner, 'draft')).toBe(MAX_DRAFTS);
    await deleteTestUsers(db, owner);
  });

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

describe('the Today tray', () => {
  it('leaves out a look’s frame and its render on her model', async () => {
    const owner = await createTestUser(db);
    const add = (kind: 'key_piece' | 'look_render', input: Record<string, unknown>) =>
      db
        .insertInto('generationJobs')
        .values({ userId: owner, kind, input: JSON.stringify(input) })
        .returning('id')
        .executeTakeFirstOrThrow();
    const set = await add('key_piece', { mode: 'prompt', prompt: 'dinner' });
    const idea = await add('look_render', { target: 'idea', ideaId: setId, idx: 1 });
    await add('look_render', { target: 'frame', lookId: setId, frameKey: 'k' });
    await add('look_render', { target: 'look', lookId: setId, renderKey: 'k' });
    const tray = await jobs.recent(owner, ['key_piece', 'look_render']);
    expect(tray.map((j) => j.id).sort()).toEqual([set.id, idea.id].sort());
    await deleteTestUsers(db, owner);
  });
});

describe('looks ready (the notifier)', () => {
  it('counts a set’s ready frames from its looks', async () => {
    const owner = await createTestUser(db);
    const shoe = (await wardrobe.create(owner, { label: 'Loafer' })).id;
    const set = await db
      .insertInto('artifacts')
      .values({ userId: owner, type: 'idea', title: 'Dinner', data: JSON.stringify({ set: true }) })
      .returning('id')
      .executeTakeFirstOrThrow();
    const [hero] = await system.suggested.mintSet(owner, set.id, [
      {
        setIndex: 0,
        name: 'One',
        note: null,
        pieces: [{ pieceId: shoe, role: null }],
        proposals: [],
        anchorPieceId: null,
        dateHint: null,
      },
    ]);
    const state = () => system.notifier.state([owner], { from: '2026-10-15', to: '2026-10-21' });
    expect((await state()).ideas[0]).toMatchObject({ id: set.id, isSet: true, readyFrames: 0 });
    const asset = await db
      .insertInto('assets')
      .values({
        userId: owner,
        kind: 'generated',
        contentType: 'image/png',
        provider: 's3',
        status: 'ready',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .updateTable('looks')
      .set({ frameAssetId: asset.id })
      .where('id', '=', hero ?? '')
      .execute();
    expect((await state()).ideas[0]).toMatchObject({ readyFrames: 1 });
    await deleteTestUsers(db, owner);
  });
});

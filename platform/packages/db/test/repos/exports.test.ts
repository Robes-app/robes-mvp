import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { dataExport } = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db, 'Niall Export');
  bea = await createTestUser(db, 'Bea Export');
  // This suite owns the global queue while it runs (files run serially).
  await db.deleteFrom('dataExportRequests').execute();
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('data export (SEC-81)', () => {
  it('returns the same request for a day, and keeps requests to their owner', async () => {
    const first = await repos.exports.request(ann);
    const again = await repos.exports.request(ann);
    expect(first.created).toBe(true);
    expect(again).toMatchObject({ id: first.id, created: false });
    expect(await repos.exports.latest(bea)).toBeUndefined();
    expect((await repos.exports.latest(ann))?.id).toBe(first.id);
  });

  it('claims once, completes with a 7-day expiry, and retries a failed run later', async () => {
    const claimed = await dataExport.claimNext();
    expect(claimed?.userId).toBe(ann);
    expect(await dataExport.claimNext()).toBeUndefined();
    await dataExport.fail(claimed?.id ?? '');
    expect(await dataExport.claimNext()).toBeUndefined();
    const retried = await dataExport.claimNext({ retryAfterMinutes: 0 });
    expect(retried?.id).toBe(claimed?.id);
    await dataExport.complete(claimed?.id ?? '', 'exports/x/y.json');
    const ready = await repos.exports.latest(ann);
    expect(ready).toMatchObject({ status: 'ready', assetKey: 'exports/x/y.json' });
    const days = ((ready?.expiresAt?.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it('collects only her own data, with calendar days as text and no session tokens', async () => {
    await repos.wardrobe.create(ann, { label: 'Niall coat', material: 'tweed' });
    await repos.wardrobe.create(bea, { label: 'Bea coat' });
    const look = await repos.looks.create(ann, {
      name: 'Office',
      nameProvisional: false,
      pieces: [],
    });
    await repos.looks.wear(ann, look.id, '2026-09-24');
    await repos.plan.pin(ann, look.id, ['2026-10-01'], { slot: 'day' });
    await repos.plan.nameDay(ann, '2026-10-02', 'Ann’s gallery night');
    await repos.plan.nameDay(bea, '2026-10-02', 'Bea’s day');
    const doc = await dataExport.collect(ann);
    expect(doc.dayNames).toEqual([
      expect.objectContaining({ dayDate: '2026-10-02', name: 'Ann’s gallery night' }),
    ]);
    expect(doc.user?.email).toBe(`${ann}@test.dev`);
    expect(doc.pieces.map((p) => [p.label, p.material])).toEqual([['Niall coat', 'tweed']]);
    expect(doc.wears[0]?.wornOn).toBe('2026-09-24');
    // The wear filed the look on its day too, so the plan holds both days, as text.
    expect(doc.plan.map((p) => p.dayDate).sort()).toEqual(['2026-09-24', '2026-10-01']);
    const json = JSON.stringify(doc);
    expect(json).not.toContain('Bea coat');
    expect(json).not.toContain('Bea’s day');
    expect(json).not.toMatch(/"token":"[^"]*session/i);
    expect(Object.keys(doc)).not.toContain('sessions');
  });

  it('includes her brief, its paragraph and read time, and her memory (SEC-81)', async () => {
    await repos.styleDna.addLine(ann, 'loves', 'Ann loves navy');
    await repos.styleDna.addLine(bea, 'loves', 'Bea loves red');
    await repos.styleMemory.record(ann, { kind: 'ask', body: 'Ann asked for flats' });
    await repos.styleMemory.record(bea, { kind: 'ask', body: 'Bea asked for heels' });
    await db
      .insertInto('styleProfiles')
      .values({ userId: ann, briefNotes: 'Ann notes', briefReadAt: new Date() })
      .onConflict((oc) =>
        oc.column('userId').doUpdateSet({ briefNotes: 'Ann notes', briefReadAt: new Date() }),
      )
      .execute();
    await repos.styleProfile.setPalette(ann, { fam: { greens: 1 }, shade: {}, print: {} });
    const doc = await dataExport.collect(ann);
    expect(doc.styleProfile?.palette).toEqual({ fam: { greens: 1 }, shade: {}, print: {} });
    expect(doc.styleBriefLines.map((l) => l.text)).toEqual(['Ann loves navy']);
    expect(doc.styleMemory.map((m) => m.body)).toEqual(['Ann asked for flats']);
    expect(doc.styleProfile?.briefNotes).toBe('Ann notes');
    expect(doc.styleProfile?.briefReadAt).toBeInstanceOf(Date);
    const json = JSON.stringify(doc);
    expect(json).not.toContain('Bea loves red');
    expect(json).not.toContain('Bea asked for heels');
  });

  it('includes her model and her twin, and only hers (SEC-81)', async () => {
    await repos.model.file(ann, 'w-s3-h1-nt', { source: 'hand' });
    await repos.model.file(bea, 'w-s1-h0-nt', { source: 'hand' });
    const doc = await dataExport.collect(ann);
    expect(doc.model).toMatchObject({ avatarId: 'w-s3-h1-nt', twinAssetId: null, twinKey: null });
    expect(JSON.stringify(doc)).not.toContain('w-s1-h0-nt');
  });
});

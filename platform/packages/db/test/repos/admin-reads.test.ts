import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotAdmin } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { adminReads } = repos;
let admin: UserId;
let support: UserId;
let plain: UserId;
let target: UserId;
let other: UserId;

const as = (id: UserId, ip = '203.0.113.7') => ({ admin: id, ip });
const auditsBy = (actor: string) =>
  db.selectFrom('auditLog').selectAll().where('actorId', '=', actor).orderBy('createdAt').execute();

beforeAll(async () => {
  admin = await createTestUser(db, 'Ada Admin');
  support = await createTestUser(db, 'Sam Support');
  plain = await createTestUser(db, 'Pat Plain');
  target = await createTestUser(db, 'Tia Target');
  other = await createTestUser(db, 'Oli Other');
  await db
    .insertInto('adminUsers')
    .values([
      { userId: admin, role: 'admin' },
      { userId: support, role: 'support' },
    ])
    .execute();
  await repos.wardrobe.create(target, { label: 'Coat' });
  await repos.consents.record(target, { analytics: true }, 'web');
  await repos.usage.consume(target, 'generation.text', 2);
  const { job } = await repos.jobs.create(target, { kind: 'fake', input: {} });
  await db
    .updateTable('generationJobs')
    .set({ status: 'failed', error: 'ai_timeout' })
    .where('id', '=', job.id)
    .execute();
  await repos.jobs.create(other, { kind: 'fake', input: {} });
  await db
    .insertInto('generationCalls')
    .values({
      userId: target,
      feature: 'looks.style_piece',
      model: 'gemini-x',
      status: 'ok',
      costMicros: 1234,
    })
    .execute();
});
afterAll(async () => {
  await deleteTestUsers(db, admin, support, plain, target, other);
  await db.destroy();
});

describe('admin reads (SEC-11)', () => {
  it('refuses non-admins, including staff roles, and writes nothing', async () => {
    for (const actor of [plain, support]) {
      await expect(adminReads.listUsers(as(actor), { limit: 5 })).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.userDetail(as(actor), target)).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.health(as(actor))).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.costs(as(actor), 30)).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.flags(as(actor))).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.setFlag(as(actor), 'uploads', false)).rejects.toBeInstanceOf(
        NotAdmin,
      );
      await expect(adminReads.auditLog(as(actor), { limit: 5 })).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.metrics(as(actor), 7)).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.userRecords(as(actor), target)).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.generationCall(as(actor), target)).rejects.toBeInstanceOf(NotAdmin);
      await expect(adminReads.feedbackFeed(as(actor), { limit: 5 })).rejects.toBeInstanceOf(
        NotAdmin,
      );
      await expect(adminReads.artifact(as(actor), target)).rejects.toBeInstanceOf(NotAdmin);
      expect(await auditsBy(actor)).toEqual([]);
    }
  });

  it('lists users by email prefix with counts, and audits the read', async () => {
    const email = (
      await db
        .selectFrom('users')
        .select('email')
        .where('id', '=', target)
        .executeTakeFirstOrThrow()
    ).email;
    const page = await adminReads.listUsers(as(admin), { email: email.slice(0, 12), limit: 5 });
    const row = page.items.find((u) => u.id === target);
    expect(row).toMatchObject({ pieces: '1', looks: '0', jobs: '1' });
    // A wildcard in the search is a literal, not "everything".
    expect((await adminReads.listUsers(as(admin), { email: '%', limit: 5 })).items).toEqual([]);
    const audits = await auditsBy(admin);
    expect(audits.at(-1)).toMatchObject({ action: 'admin.users.list', ip: '203.0.113.7' });
  });

  it('pages users without repeats', async () => {
    const first = await adminReads.listUsers(as(admin), { limit: 2 });
    const second = await adminReads.listUsers(as(admin), {
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    const ids = [...first.items, ...second.items].map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows one user’s detail and nobody else’s, audited against that user', async () => {
    const detail = await adminReads.userDetail(as(admin), target);
    expect(detail?.user.firstName).toBe('Tia');
    expect(detail?.consents).toEqual([
      expect.objectContaining({ kind: 'analytics', granted: true }),
    ]);
    expect(detail?.usage).toEqual([{ metric: 'generation.text', count: 2 }]);
    expect(detail?.jobs).toHaveLength(1);
    expect(detail?.jobs[0]).toMatchObject({ status: 'failed', error: 'ai_timeout' });
    expect(detail?.deletion).toBeNull();
    const audits = await auditsBy(admin);
    expect(audits.at(-1)).toMatchObject({ action: 'admin.user.read', subjectUserId: target });
    expect(
      await adminReads.userDetail(as(admin), '00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();
  });

  it('lists one user’s records and nobody else’s, audited against that user', async () => {
    const look = await db
      .insertInto('looks')
      .values({ userId: target, name: 'Office armour', status: 'saved', source: 'manual' })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('wears')
      .values({ userId: target, lookId: look.id, wornOn: new Date('2026-10-20T12:00:00Z') })
      .execute();
    await db
      .insertInto('looks')
      .values({ userId: other, name: 'Not hers', status: 'saved', source: 'manual' })
      .execute();
    const art = await db
      .insertInto('artifacts')
      .values({ userId: target, type: 'key_piece', title: 'Coat, three ways', data: '{"ways":[]}' })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .insertInto('feedback')
      .values({ userId: target, rating: 0, note: 'Too formal', subjectType: 'look' })
      .execute();
    await db
      .insertInto('styleMemory')
      .values({ userId: target, kind: 'verdict', verdict: 1, subject: 'Office armour' })
      .execute();

    const photo = await db
      .insertInto('assets')
      .values({
        userId: target,
        kind: 'wardrobe',
        status: 'ready',
        renditions: JSON.stringify({ v: 1, master: { width: 800, height: 1000 }, widths: [320] }),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await db
      .updateTable('wardrobeItems')
      .set({ imageAssetId: photo.id })
      .where('userId', '=', target)
      .execute();

    const r = await adminReads.userRecords(as(admin), target);
    expect(r?.pieces[0]?.image).toMatchObject({ id: photo.id, status: 'ready' });
    expect(r?.pieceCount).toBe(1);
    expect(r?.pieces.map((p) => p.label)).toEqual(['Coat']);
    expect(r?.looks).toEqual([
      expect.objectContaining({ name: 'Office armour', wears: '1', lastWornOn: '2026-10-20' }),
    ]);
    expect(r?.artifacts.map((a) => a.title)).toEqual(['Coat, three ways']);
    expect(r?.feedback[0]).toMatchObject({ rating: 0, note: 'Too formal' });
    expect(r?.memory[0]).toMatchObject({ kind: 'verdict', subject: 'Office armour' });
    expect(r?.calls[0]).toMatchObject({ feature: 'looks.style_piece', hasPrompt: false });
    expect(JSON.stringify(r)).not.toContain('Not hers');
    expect((await auditsBy(admin)).at(-1)).toMatchObject({
      action: 'admin.user.records',
      subjectUserId: target,
    });
    expect(
      await adminReads.userRecords(as(admin), '00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();

    const viewed = await adminReads.artifact(as(admin), art.id);
    expect(viewed).toMatchObject({ type: 'key_piece', userId: target, data: { ways: [] } });
    expect((await auditsBy(admin)).at(-1)).toMatchObject({
      action: 'admin.artifact.read',
      subjectId: art.id,
    });
  });

  it('opens one model call with its prompt, audited against its user', async () => {
    const call = await db
      .insertInto('generationCalls')
      .values({
        userId: target,
        feature: 'looks.daily',
        model: 'gemini-x',
        status: 'ok',
        prompt: 'Dress her for Friday',
        response: JSON.stringify({ headline: 'Friday' }),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const c = await adminReads.generationCall(as(admin), call.id);
    expect(c).toMatchObject({
      prompt: 'Dress her for Friday',
      response: { headline: 'Friday' },
      userId: target,
    });
    expect((await auditsBy(admin)).at(-1)).toMatchObject({
      action: 'admin.call.read',
      subjectUserId: target,
      subjectId: call.id,
    });
    expect(
      await adminReads.generationCall(as(admin), '00000000-0000-4000-8000-000000000000'),
    ).toBeUndefined();
  });

  it('feeds every rating newest first, paged without repeats', async () => {
    await db
      .insertInto('feedback')
      .values([
        { userId: other, rating: 1, note: 'Loved it', subjectType: 'look' },
        { userId: other, rating: null, note: 'Shoes off', subjectType: 'look' },
      ])
      .execute();
    const first = await adminReads.feedbackFeed(as(admin), { limit: 2 });
    const second = await adminReads.feedbackFeed(as(admin), {
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    const ids = [...first.items, ...second.items].map((f) => f.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.items[0]?.email).toContain('@test.dev');
    expect((await auditsBy(admin)).at(-1)).toMatchObject({ action: 'admin.feedback.list' });
  });

  it('reports job health and costs without prompts', async () => {
    const health = await adminReads.health(as(admin));
    expect(health.counts.some((c) => c.kind === 'fake' && c.status === 'failed')).toBe(true);
    expect(health.errors.some((e) => e.error === 'ai_timeout')).toBe(true);
    const costs = await adminReads.costs(as(admin), 30);
    expect(costs.spenders.find((s) => s.id === target)?.costMicros).toBe('1234');
    expect(JSON.stringify(costs)).not.toContain('prompt');
  });

  it('toggles only seeded flags, recording before and after', async () => {
    const flags = await adminReads.flags(as(admin));
    const uploads = flags.find((f) => f.key === 'uploads');
    expect(uploads).toBeDefined();
    const was = uploads?.enabled ?? true;
    expect(await adminReads.setFlag(as(admin), 'no.such.flag', true)).toBeUndefined();
    const set = await adminReads.setFlag(as(admin, 'unknown'), 'uploads', !was);
    expect(set?.enabled).toBe(!was);
    const audits = await auditsBy(admin);
    expect(audits.at(-1)).toMatchObject({
      action: 'admin.flag.set',
      subjectId: 'uploads',
      detail: { from: was, to: !was },
      ip: null,
    });
    await adminReads.setFlag(as(admin), 'uploads', was);
  });

  it('reads the audit log, filtered to one user', async () => {
    const page = await adminReads.auditLog(as(admin), { limit: 50, userId: target });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((a) => a.subjectUserId === target)).toBe(true);
    expect(page.items[0]?.actorEmail).toContain('@test.dev');
  });

  it('aggregates the operating metrics, counts only, and audits the read', async () => {
    const before = await adminReads.metrics(as(admin), 7);
    expect(before.daily).toHaveLength(7);
    expect(before.daily.at(-1)?.day).toBe(new Date().toISOString().slice(0, 10));

    const newbie = await createTestUser(db, 'Nia New');
    try {
      await repos.wardrobe.create(newbie, { label: 'Secret silk shirt' });
      await db
        .insertInto('looks')
        .values([{ userId: newbie, name: 'Hidden look', status: 'saved', source: 'manual' }])
        .execute();
      const set = await db
        .insertInto('artifacts')
        .values({ userId: newbie, type: 'idea', title: 'Set' })
        .returning('id')
        .executeTakeFirstOrThrow();
      await db
        .insertInto('looks')
        .values([
          { userId: newbie, name: 'Kept', status: 'saved', setId: set.id, source: 'generated' },
          {
            userId: newbie,
            name: 'Passed',
            status: 'suggested',
            setId: set.id,
            deletedAt: new Date(),
          },
          { userId: newbie, name: 'Waiting', status: 'suggested', setId: set.id },
        ])
        .execute();
      const started = new Date(Date.now() - 2000);
      const [ask, frame] = await db
        .insertInto('generationJobs')
        .values([
          { userId: newbie, kind: 'look_ask', status: 'failed', error: 'ai_timeout' },
          {
            userId: newbie,
            kind: 'look_render',
            input: JSON.stringify({ target: 'frame' }),
            status: 'succeeded',
            startedAt: started,
            finishedAt: new Date(),
          },
          { userId: newbie, kind: 'style_brief', status: 'queued' },
        ])
        .returning('id')
        .execute();
      await db
        .insertInto('generationCalls')
        .values({
          userId: newbie,
          jobId: frame?.id ?? null,
          feature: 'looks.frame',
          model: 'img',
          status: 'ok',
          costMicros: 5000,
        })
        .execute();
      expect(ask).toBeDefined();
      await db
        .insertInto('notifications')
        .values({ userId: newbie, kind: 'looks_ready', ref: 'r1', channel: 'email' })
        .execute();

      const after = await adminReads.metrics(as(admin), 7);
      const today = (m: typeof after) => m.daily.at(-1);
      expect((today(after)?.signups ?? 0) - (today(before)?.signups ?? 0)).toBe(1);
      expect((today(after)?.active ?? 0) - (today(before)?.active ?? 0)).toBeGreaterThanOrEqual(1);
      expect(after.funnel.signedUp - before.funnel.signedUp).toBe(1);
      expect(after.funnel.firstPiece - before.funnel.firstPiece).toBe(1);
      expect(after.funnel.firstSavedLook - before.funnel.firstSavedLook).toBe(1);
      const src = (m: typeof after, s: string) =>
        m.looksBySource.find((r) => r.source === s)?.n ?? 0;
      expect(src(after, 'manual') - src(before, 'manual')).toBe(1);
      expect(after.deck.kept - before.deck.kept).toBe(1);
      expect(after.deck.passed - before.deck.passed).toBe(1);
      expect(after.deck.waiting - before.deck.waiting).toBe(1);
      const kind = (m: typeof after, k: string) => m.jobs.find((r) => r.kind === k);
      expect((kind(after, 'look_ask')?.failed ?? 0) - (kind(before, 'look_ask')?.failed ?? 0)).toBe(
        1,
      );
      const f = kind(after, 'look_render:frame');
      expect((f?.succeeded ?? 0) - (kind(before, 'look_render:frame')?.succeeded ?? 0)).toBe(1);
      expect((f?.costMicros ?? 0) - (kind(before, 'look_render:frame')?.costMicros ?? 0)).toBe(
        5000,
      );
      expect(f?.p50Ms).toBeGreaterThan(0);
      expect(after.queue.queued - before.queue.queued).toBe(1);
      expect(after.email.sent - before.email.sent).toBe(1);

      const json = JSON.stringify(after);
      expect(json).not.toContain('Secret silk shirt');
      expect(json).not.toContain('Hidden look');
      expect(json).not.toContain('@test.dev');
      expect((await auditsBy(admin)).at(-1)).toMatchObject({
        action: 'admin.metrics.read',
        detail: { days: 7 },
      });
    } finally {
      await deleteTestUsers(db, newbie);
    }
  });
});

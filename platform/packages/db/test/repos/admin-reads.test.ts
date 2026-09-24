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
});

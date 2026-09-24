import { createRepositories, createSystemRepositories, type UserId } from '@robes/db';
import { createTestDb, createTestUser, deleteTestUsers } from '@robes/db/testing';
import { verifyUnsub } from '@robes/emails';
import { createMemoryMailer, type Email } from '@robes/mailer';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { JobLogger } from '../src/logger';
import { createMemoryPushSender, type PushSender } from '../src/notify/push';
import { notifyTick } from '../src/notify/tick';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
const logger: JobLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const SECRET = 'test-unsub-secret';
let ann: UserId;
let bea: UserId;
let annEmail: string;

async function withIdea(user: UserId): Promise<string> {
  const job = await repos.jobs.create(user, { kind: 'fake', input: {} });
  const frames = [0, 1, 2].map((idx) => ({ idx, assetId: null, status: 'ready' }));
  return system.styling.createIdea(user, {
    jobId: job.job.id,
    title: 'camel coat',
    subtitle: '',
    data: { images: frames },
  });
}

const tick = (mailer = createMemoryMailer()) =>
  notifyTick({
    notifier: system.notifier,
    mailer,
    appUrl: 'https://app.test',
    unsubSecret: SECRET,
    logger,
  }).then((out) => ({ out, mailer }));

const to = (sent: Email[], email: string) => sent.filter((m) => m.to === email);

beforeAll(async () => {
  ann = await createTestUser(db, 'Niall Notify');
  bea = await createTestUser(db, 'Bea Notify');
  for (const u of [ann, bea]) await repos.profiles.completeOnboarding(u);
  annEmail = `${ann}@test.dev`;
  await db
    .insertInto('emailSuppressions')
    .values({ email: `${bea}@test.dev`, reason: 'bounce' })
    .execute();
});
afterAll(async () => {
  await db.deleteFrom('emailSuppressions').where('email', '=', `${bea}@test.dev`).execute();
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('notify tick (legacy notify.js sequence)', () => {
  it('mails looks_ready once, with a working one-click unsubscribe', async () => {
    const ideaId = await withIdea(ann);
    const first = await tick();
    const [mail] = to(first.mailer.sent, annEmail);
    expect(mail?.subject).toBe('Your three looks are ready.');
    expect(mail?.text).toContain('Camel coat, worn three ways.');
    expect(mail?.text).toContain(`https://app.test/looks/ideas/${ideaId}?from=email`);
    expect(mail?.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const oneClick = new URL(mail?.headers?.['List-Unsubscribe']?.slice(1, -1) ?? '');
    const token = decodeURIComponent(oneClick.pathname.split('/').at(-1) ?? '');
    expect(verifyUnsub(SECRET, token)).toEqual({ userId: ann, pref: 'looksReady' });

    const again = await tick();
    expect(to(again.mailer.sent, annEmail)).toEqual([]);
  });

  it('never mails a suppressed address', async () => {
    await withIdea(bea);
    const { mailer } = await tick();
    expect(to(mailer.sent, `${bea}@test.dev`)).toEqual([]);
  });

  it('gives the claim back when sending fails, so the next tick retries', async () => {
    const other = await createTestUser(db, 'Cat Notify');
    await repos.profiles.completeOnboarding(other);
    await withIdea(other);
    const failing = {
      send: vi.fn(async (m: Email) => {
        if (m.to === `${other}@test.dev`) throw new Error('smtp down');
      }),
    };
    await notifyTick({
      notifier: system.notifier,
      mailer: failing,
      appUrl: 'https://app.test',
      unsubSecret: SECRET,
      logger,
    });
    const { mailer } = await tick();
    expect(to(mailer.sent, `${other}@test.dev`)).toHaveLength(1);
    await deleteTestUsers(db, other);
  });

  it('also pushes looks_ready to her devices, once, and drops dead devices', async () => {
    const dan = await createTestUser(db, 'Dan Notify');
    await repos.profiles.completeOnboarding(dan);
    const live = `ExponentPushToken[${crypto.randomUUID()}]`;
    const dead = `ExponentPushToken[${crypto.randomUUID()}]`;
    for (const expoToken of [live, dead]) {
      await repos.pushTokens.register(dan, { expoToken, platform: 'ios' });
    }
    const ideaId = await withIdea(dan);
    const memory = createMemoryPushSender();
    const sender: PushSender = {
      async send(messages) {
        await memory.send(messages);
        return { deadTokens: [dead] };
      },
    };
    const run = () =>
      notifyTick({
        notifier: system.notifier,
        mailer: createMemoryMailer(),
        appUrl: 'https://app.test',
        unsubSecret: SECRET,
        logger,
        push: { sender, tokens: system.pushDelivery },
      });
    await run();
    const mine = memory.sent.filter((m) => m.to === live || m.to === dead);
    expect(mine.map((m) => m.to).sort()).toEqual([live, dead].sort());
    expect(mine[0]).toMatchObject({
      title: 'Your three looks are ready.',
      data: { url: `robes://looks/ideas/${ideaId}` },
    });
    expect((await repos.pushTokens.active(dan)).map((t) => t.expoToken)).toEqual([live]);

    const before = memory.sent.length;
    await run();
    expect(memory.sent.slice(before).filter((m) => m.to === live)).toEqual([]);
    await deleteTestUsers(db, dan);
  });
});

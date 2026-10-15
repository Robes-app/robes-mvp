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
const DAY_MS = 86_400_000;
let ann: UserId;
let bea: UserId;
let annEmail: string;

async function withIdea(user: UserId): Promise<string> {
  const job = await repos.jobs.create(user, { kind: 'fake', input: {} });
  // As style-a-piece writes them now: the hero ready, the other two deferred until asked for.
  const frames = [0, 1, 2].map((idx) => ({
    idx,
    assetId: null,
    status: idx === 0 ? 'ready' : 'deferred',
  }));
  return system.styling.createIdea(user, {
    jobId: job.job.id,
    title: 'camel coat',
    subtitle: '',
    data: { images: frames },
  });
}

// Late morning in Dublin today: inside the sequence's 08:00–20:00 whenever the suite runs.
const real = new Date();
const NOW = new Date(Date.UTC(real.getUTCFullYear(), real.getUTCMonth(), real.getUTCDate(), 11));

const tick = (mailer = createMemoryMailer(), extra: { replyTo?: string } = {}) =>
  notifyTick(
    {
      notifier: system.notifier,
      mailer,
      appUrl: 'https://app.test',
      unsubSecret: SECRET,
      logger,
      ...extra,
    },
    NOW,
  ).then((out) => ({ out, mailer }));

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
    await notifyTick(
      {
        notifier: system.notifier,
        mailer: failing,
        appUrl: 'https://app.test',
        unsubSecret: SECRET,
        logger,
      },
      NOW,
    );
    const { mailer } = await tick();
    expect(to(mailer.sent, `${other}@test.dev`)).toHaveLength(1);
    await deleteTestUsers(db, other);
  });

  it('pushes looks_ready to her devices instead of mailing it, once, and drops dead devices', async () => {
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
    const mailer = createMemoryMailer();
    const run = () =>
      notifyTick(
        {
          notifier: system.notifier,
          mailer,
          appUrl: 'https://app.test',
          unsubSecret: SECRET,
          logger,
          push: { sender, tokens: system.pushDelivery },
        },
        NOW,
      );
    await run();
    // A kind that moved to push stops sending as email once she has push on (7-day brief).
    expect(to(mailer.sent, `${dan}@test.dev`)).toEqual([]);
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

  it('first_piece: four hours in with nothing filed, once, replies reaching Annie', async () => {
    const eve = await createTestUser(db, 'Eve Notify');
    await repos.profiles.completeOnboarding(eve);
    await repos.profiles.mergeNotificationPrefs(eve, { nudges: true });
    const joined = new Date(NOW.getTime() - 5 * 3_600_000);
    await db.updateTable('users').set({ createdAt: joined }).where('id', '=', eve).execute();
    const { mailer } = await tick(undefined, { replyTo: 'annie@byrobes.com' });
    const [mail] = to(mailer.sent, `${eve}@test.dev`);
    expect(mail?.subject).toBe('One piece is enough.');
    const oneClick = new URL(mail?.headers?.['List-Unsubscribe']?.slice(1, -1) ?? '');
    const token = decodeURIComponent(oneClick.pathname.split('/').at(-1) ?? '');
    expect(verifyUnsub(SECRET, token)).toEqual({ userId: eve, pref: 'nudges' });
    expect(mail?.text).toContain('https://app.test/wardrobe/add?from=email');
    expect(mail?.replyTo).toBe('annie@byrobes.com');
    expect(mail?.text).toContain('Reply to this email — it reaches Annie');
    expect(to((await tick()).mailer.sent, `${eve}@test.dev`)).toEqual([]);
    // A piece filed means nothing to ask for.
    const fay = await createTestUser(db, 'Fay Notify');
    await repos.profiles.completeOnboarding(fay);
    await db.updateTable('users').set({ createdAt: joined }).where('id', '=', fay).execute();
    await repos.wardrobe.create(fay, { label: 'Camel coat' });
    expect(to((await tick()).mailer.sent, `${fay}@test.dev`)).toEqual([]);
    await deleteTestUsers(db, eve, fay);
  });

  it('week_one on day six: her week on paper, by the first tier she has not reached', async () => {
    const gil = await createTestUser(db, 'Gil Notify');
    await repos.profiles.completeOnboarding(gil);
    await repos.profiles.mergeNotificationPrefs(gil, { nudges: true });
    const joined = new Date(NOW.getTime() - (6 * 24 + 1) * 3_600_000);
    await db.updateTable('users').set({ createdAt: joined }).where('id', '=', gil).execute();
    for (const label of ['Camel coat', 'Cream knit']) await repos.wardrobe.create(gil, { label });
    // week_empty went on day five.
    await system.notifier.claim(gil, 'week_empty', 'w');
    await db
      .updateTable('notifications')
      .set({ sentAt: new Date(NOW.getTime() - 26 * 3_600_000) })
      .where('userId', '=', gil)
      .execute();
    const { mailer } = await tick();
    const [mail] = to(mailer.sent, `${gil}@test.dev`);
    expect(mail?.subject).toBe('Your week, on paper.');
    expect(mail?.text).toContain('Two pieces filed. No looks kept.');
    expect(mail?.text).toContain('Three more pieces and Robes builds from yours alone.');
    expect(mail?.text).toContain('https://app.test/wardrobe/add?from=email');
    await deleteTestUsers(db, gil);
  });

  it('a once-ever kind sent long ago never burns the day: the next message goes', async () => {
    const hal = await createTestUser(db, 'Hal Notify');
    await repos.profiles.completeOnboarding(hal);
    await repos.profiles.mergeNotificationPrefs(hal, { nudges: true });
    await db
      .updateTable('users')
      .set({ createdAt: new Date(NOW.getTime() - 90 * DAY_MS) })
      .where('id', '=', hal)
      .execute();
    for (const label of ['a', 'b', 'c', 'd', 'e']) await repos.wardrobe.create(hal, { label });
    await db
      .updateTable('wardrobeItems')
      .set({ createdAt: new Date(NOW.getTime() - 60 * DAY_MS) })
      .where('userId', '=', hal)
      .execute();
    // five went out two months ago (outside the 30-day window); a saved look now waits for a model.
    await system.notifier.claim(hal, 'five', 'five');
    await db
      .updateTable('notifications')
      .set({ sentAt: new Date(NOW.getTime() - 60 * DAY_MS) })
      .where('userId', '=', hal)
      .execute();
    const coat = (await repos.wardrobe.create(hal, { label: 'Camel coat' })).id;
    await repos.looks.create(hal, {
      name: 'Office',
      nameProvisional: false,
      pieces: [{ pieceId: coat }],
    });
    const [mail] = to((await tick()).mailer.sent, `${hal}@test.dev`);
    expect(mail?.subject).toBe('She’d wear it.');
    await deleteTestUsers(db, hal);
  });
});

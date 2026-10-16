import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createRepositories } from '../../src/repos';
import { createTestDb } from '../fixtures';

const db = createTestDb();
const { waitlist } = createRepositories(db);
const emails: string[] = [];
const email = () => {
  const e = `wl-${randomUUID()}@test.dev`;
  emails.push(e);
  return e;
};
afterAll(async () => {
  await db.deleteFrom('waitlist').where('email', 'in', emails).execute();
  await db.destroy();
});

describe('waitlist (SEC-60)', () => {
  it('adds a new address once and never changes an existing contact', async () => {
    const e = email();
    const id = await waitlist.join({
      email: e,
      name: 'Niall',
      source: 'home',
      utm: { utm_source: 'ig' },
    });
    expect(id).toBeDefined();
    expect(await waitlist.join({ email: e.toUpperCase(), name: 'Someone else' })).toBeUndefined();
    const row = await db
      .selectFrom('waitlist')
      .select(['name', 'utm'])
      .where('email', '=', e)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ name: 'Niall', utm: { utm_source: 'ig' } });
  });

  it('confirms once, and never an unsubscribed contact', async () => {
    const id = (await waitlist.join({ email: email() })) ?? '';
    expect(await waitlist.confirm(id)).toBe(true);
    expect(await waitlist.confirm(id)).toBe(false);
    expect((await waitlist.get(id))?.confirmedAt).toBeInstanceOf(Date);

    const gone = (await waitlist.join({ email: email() })) ?? '';
    await db
      .updateTable('waitlist')
      .set({ unsubscribedAt: new Date() })
      .where('id', '=', gone)
      .execute();
    expect(await waitlist.confirm(gone)).toBe(false);
  });
});

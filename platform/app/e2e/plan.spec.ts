import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('a look is pinned to days, renamed, unpinned and undone', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } })
  ).json();

  const plan = await (await api.get('/api/v1/plan')).json();
  expect(plan.days).toHaveLength(30);
  expect(plan.days[0].date).toBe(plan.from);

  const pinned = await api.post(`/api/v1/plan/looks/${look.id}/days`, {
    data: { dates: ['2026-10-01', '2026-10-03'], activity: 'Board meeting' },
  });
  expect(pinned.status()).toBe(201);
  const { entries } = await pinned.json();
  expect(entries.map((e: { date: string }) => e.date)).toEqual(['2026-10-01', '2026-10-03']);
  expect(entries[0]).toMatchObject({
    slot: 'day',
    activity: 'Board meeting',
    look: { name: 'Office' },
  });

  const week = await (await api.get('/api/v1/plan?from=2026-10-01&days=7')).json();
  expect(week.to).toBe('2026-10-07');
  const withLooks = week.days.filter((d: { entries: unknown[] }) => d.entries.length > 0);
  expect(withLooks.map((d: { date: string }) => d.date)).toEqual(['2026-10-01', '2026-10-03']);

  const url = `/api/v1/plan/entries/${entries[0].id}`;
  expect((await (await api.patch(url, { data: { slot: 'evening' } })).json()).slot).toBe('evening');
  expect((await api.delete(url)).ok()).toBe(true);
  const after = await (await api.get('/api/v1/plan?from=2026-10-01&days=1')).json();
  expect(after.days[0].entries).toEqual([]);
  expect((await api.post(`${url}/restore`)).ok()).toBe(true);
  const back = await (await api.get('/api/v1/plan?from=2026-10-01&days=1')).json();
  expect(back.days[0].entries).toHaveLength(1);
});

test('plans are private', async ({ page, browser }) => {
  await signIn(page);
  const look = await (
    await page.request.post('/api/v1/looks', { data: { name: 'Mine', pieces: [] } })
  ).json();
  const { entries } = await (
    await page.request.post(`/api/v1/plan/looks/${look.id}/days`, {
      data: { dates: ['2026-10-10'] },
    })
  ).json();

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect(
    (
      await otherPage.request.post(`/api/v1/plan/looks/${look.id}/days`, {
        data: { dates: ['2026-10-11'] },
      })
    ).status(),
  ).toBe(404);
  const url = `/api/v1/plan/entries/${entries[0].id}`;
  expect((await otherPage.request.patch(url, { data: { activity: 'x' } })).status()).toBe(404);
  expect((await otherPage.request.delete(url)).status()).toBe(404);
  const theirs = await (await otherPage.request.get('/api/v1/plan?from=2026-10-10&days=1')).json();
  expect(theirs.days[0].entries).toEqual([]);
  await other.close();
});

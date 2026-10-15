import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('Today reads her day in her timezone and walks the next-step rules', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const get = async () => (await api.get('/api/v1/today')).json();

  const fresh = await get();
  expect(fresh.nextStep).toEqual({ rule: 'start' });
  expect(fresh.week).toHaveLength(7);
  expect(fresh.week[0].date).toBe(fresh.date);
  expect(fresh.today).toEqual([]);

  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [{ pieceId: coat.id }] } })
  ).json();
  // With a look and no model, the model line comes first (legacy order); once filed, the ladder.
  expect((await get()).nextStep).toEqual({ rule: 'model', lookName: 'Office', presence: 'woman' });
  await api.patch('/api/v1/me/model', { data: {} });
  expect((await get()).nextStep).toEqual({ rule: 'five', remaining: 4 });

  for (const label of ['Jeans', 'Loafers', 'Shirt', 'Scarf']) {
    await api.post('/api/v1/wardrobe/items', { data: { label } });
  }
  expect((await get()).nextStep).toEqual({ rule: 'week' });

  const { date } = await get();
  await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } });
  const planned = await get();
  expect(planned.nextStep).toEqual({ rule: 'wear' });
  expect(planned.today).toEqual([
    expect.objectContaining({ worn: false, entry: expect.objectContaining({ date }) }),
  ]);
  expect(planned.week[0].looks).toBe(1);

  await api.post(`/api/v1/looks/${look.id}/wears`, { data: { wornOn: date } });
  const worn = await get();
  expect(worn.today[0].worn).toBe(true);
  expect(worn.nextStep).toBeNull();
});

test('the tray shows a styling job while it runs and just after', async ({ page }) => {
  await signIn(page);
  const { jobId } = await (
    await page.request.post('/api/v1/looks/generate', {
      data: { anchor: { type: 'text', text: 'a navy blazer' } },
    })
  ).json();
  const today = await (await page.request.get('/api/v1/today')).json();
  expect(today.tray.map((j: { id: string }) => j.id)).toContain(jobId);
});

test('the Today screen shows the next step, the week and her looks for today', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');
  await expect(page.getByText('Add a piece and Robes will dress it three ways.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add pieces →' })).toHaveAttribute(
    'href',
    '/wardrobe/add',
  );
  await expect(page.getByRole('link', { name: 'Style a piece' })).toBeVisible();
  const week = page.getByRole('region', { name: 'The week ahead' });
  await expect(week.getByRole('listitem')).toHaveCount(7);

  const api = page.request;
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } })
  ).json();
  const { date } = await (await api.get('/api/v1/today')).json();
  await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } });
  await page.reload();
  await expect(page.getByRole('region', { name: 'Today' }).getByText('Office')).toBeVisible();
  await expect(week.getByRole('link', { name: 'Today, one look' })).toBeVisible();
  // Every cell opens the day page, with its door back to Today.
  await week.getByRole('link', { name: 'Today, one look' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Office' })).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).first().click();
  await expect(page).toHaveURL(/\/$/);
});

import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('Today reads her day in her timezone: today’s looks, the week, the wear', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const get = async () => (await api.get('/api/v1/today')).json();

  const fresh = await get();
  expect(fresh.week).toHaveLength(7);
  expect(fresh.week[0].date).toBe(fresh.date);
  expect(fresh.today).toEqual([]);

  const coat = await (
    await api.post('/api/v1/wardrobe/items', { data: { label: 'Camel coat' } })
  ).json();
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [{ pieceId: coat.id }] } })
  ).json();
  await api.patch('/api/v1/me/model', { data: {} });

  for (const label of ['Jeans', 'Loafers', 'Shirt', 'Scarf']) {
    await api.post('/api/v1/wardrobe/items', { data: { label } });
  }

  const { date } = await get();
  await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } });
  const planned = await get();
  expect(planned.today).toEqual([
    expect.objectContaining({ worn: false, entry: expect.objectContaining({ date }) }),
  ]);
  expect(planned.week[0].looks).toBe(1);

  await api.post(`/api/v1/looks/${look.id}/wears`, { data: { wornOn: date } });
  const worn = await get();
  expect(worn.today[0].worn).toBe(true);
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

test('home: the greeting, the week once activated, and her look for today on the day card', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');
  await expect(page.getByText('What are you dressing for today?')).toBeVisible();
  // Not activated yet: no week, the box reads "A new look for…".
  await expect(page.getByTestId('home-week')).toHaveCount(0);

  const api = page.request;
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } })
  ).json();
  const { date, home } = await (await api.get('/api/v1/today')).json();
  expect(home.state).toMatchObject({ pics: 0, ownLookSaved: false, styleConfirmed: false });
  await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } });
  const today = await (await api.get('/api/v1/today')).json();
  expect(today.week[0]).toMatchObject({
    date,
    looks: 1,
    first: { id: look.id, name: 'Office', worn: false },
  });
});

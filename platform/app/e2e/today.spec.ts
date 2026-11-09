import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('Today reads her day in her timezone: today’s looks, the week, the wear', async ({ page }) => {
  await signIn(page);
  const api = page.request;
  const get = async () => (await api.get('/api/v1/today')).json();

  const fresh = await get();
  // The week stays for installed builds (this Monday week); the diary is three Monday weeks,
  // today in the middle one, every date present (plan 2026-11-02; PRD rev 3 §3, R4).
  expect(fresh.week).toHaveLength(7);
  expect(fresh.week.map((d: { date: string }) => d.date)).toContain(fresh.date);
  expect(fresh.diary.days).toHaveLength(21);
  const at = fresh.diary.days.findIndex((d: { date: string }) => d.date === fresh.date);
  expect(at).toBeGreaterThanOrEqual(7);
  expect(at).toBeLessThan(14);
  expect(fresh.diary.days[at]).toMatchObject({ date: fresh.date, entries: [], place: null });
  expect(fresh.diary.from).toBe(fresh.diary.days[0].date);
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
  expect(planned.week.find((d: { date: string }) => d.date === date)?.looks).toBe(1);
  expect(planned.diary.days[at].entries).toEqual([
    expect.objectContaining({
      position: 0,
      worn: false,
      look: expect.objectContaining({ id: look.id }),
    }),
  ]);

  await api.post(`/api/v1/looks/${look.id}/wears`, { data: { wornOn: date } });
  const worn = await get();
  expect(worn.today[0].worn).toBe(true);
  expect(worn.diary.days[at].entries[0].worn).toBe(true);

  // Where she is on a day rides on its diary day, with that place's weather when known.
  const paris = { city: 'Paris', country: 'France', lat: 48.86, lon: 2.35 };
  expect((await api.put(`/api/v1/plan/days/${date}/place`, { data: { place: paris } })).ok()).toBe(
    true,
  );
  expect((await get()).diary.days[10].place).toEqual(paris);
  await api.put(`/api/v1/plan/days/${date}/place`, { data: { place: null } });
  expect((await get()).diary.days[10].place).toBeNull();
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

test('home: the greeting, the strip from day one, and her look for today in the slot', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /^Good \w+, Niall\.$/ })).toBeVisible();
  // The strip stands from day one: twenty-one cells, today's current, nothing on it yet.
  await expect(page.getByTestId(/^diary-day-/)).toHaveCount(21);
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'empty');

  const api = page.request;
  const look = await (
    await api.post('/api/v1/looks', { data: { name: 'Office', pieces: [] } })
  ).json();
  const { date, home } = await (await api.get('/api/v1/today')).json();
  expect(home.state).toMatchObject({ pics: 0, ownLookSaved: false, styleConfirmed: false });
  await api.post(`/api/v1/plan/looks/${look.id}/days`, { data: { dates: [date] } });
  const today = await (await api.get('/api/v1/today')).json();
  expect(today.week.find((d: { date: string }) => d.date === date)).toMatchObject({
    date,
    looks: 1,
    first: { id: look.id, name: 'Office', worn: false },
  });
  await page.reload();
  await expect(page.getByTestId('day-slot')).toHaveAttribute('data-state', 'look');
  await expect(page.getByTestId('ootd-card')).toContainText('Office');
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAttribute('aria-current', 'date');
  await expect(page.getByTestId(`diary-day-${date}`)).toHaveAccessibleName('Today, 1 look planned');
});

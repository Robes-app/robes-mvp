import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('plan a trip, see its three days, pin it and find it on the plan', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  await api.post('/api/v1/wardrobe/items', { data: { label: 'Linen shirt' } });

  await page.goto('/trip/new');
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByLabel('Destination').fill('Lisbon');
  await page.getByLabel('Your plans (one per line, optional)').fill('Beach day\nDinner\nMarket');
  await page.getByRole('button', { name: 'Linen shirt' }).click();
  await page.getByRole('button', { name: 'Plan it' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'A trip, packed once.' })).toBeVisible({
    timeout: 30_000,
  });
  const looks = page.getByRole('region', { name: 'The looks' });
  await expect(
    looks.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3 }) }),
  ).toHaveCount(3);
  await expect(page.getByText('Linen shirt').first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Add the looks to your plan' }).click();
  await expect(page.getByRole('button', { name: 'On your plan.' })).toBeDisabled();

  await page.goto('/plan');
  await expect(page.getByRole('link', { name: 'Golden Hour' }).first()).toBeVisible();
  await expect(page.getByText('Trip').first()).toBeVisible();
  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test('trips are private, and key pieces must be hers', async ({ page, browser }) => {
  await signIn(page);
  const mine = await (
    await page.request.post('/api/v1/wardrobe/items', { data: { label: 'Silk scarf' } })
  ).json();
  const started = await page.request.post('/api/v1/travel/plan', {
    data: {
      destination: 'Rome',
      dateFrom: '2026-11-02',
      dateTo: '2026-11-03',
      occasions: ['Dinner'],
    },
  });
  expect(started.status()).toBe(202);
  const { jobId } = await started.json();
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/v1/jobs/${jobId}`)).json()).output.tripId,
      {
        timeout: 30_000,
      },
    )
    .toBeTruthy();
  const { output } = await (await page.request.get(`/api/v1/jobs/${jobId}`)).json();
  const tripUrl = `/api/v1/trips/${output.tripId}`;
  expect((await page.request.get(tripUrl)).status()).toBe(200);
  const long = await page.request.post('/api/v1/travel/plan', {
    data: { destination: 'Rome', dateFrom: '2026-11-01', dateTo: '2026-11-20' },
  });
  expect(long.status()).toBe(400);

  const other = await browser.newContext();
  await isolateClientIp(other);
  const otherPage = await other.newPage();
  await signIn(otherPage);
  expect((await otherPage.request.get(tripUrl)).status()).toBe(404);
  expect((await otherPage.request.post(`${tripUrl}/pin`)).status()).toBe(404);
  expect((await otherPage.request.delete(tripUrl)).status()).toBe(404);
  const borrowed = await otherPage.request.post('/api/v1/travel/plan', {
    data: {
      destination: 'Rome',
      dateFrom: '2026-11-02',
      dateTo: '2026-11-03',
      anchorPieceIds: [mine.id],
    },
  });
  expect(borrowed.status()).toBe(404);
  await other.close();

  expect((await page.request.delete(tripUrl)).ok()).toBe(true);
  expect((await page.request.get(tripUrl)).status()).toBe(404);
  expect((await page.request.post(`${tripUrl}/restore`)).ok()).toBe(true);
  expect((await page.request.get(tripUrl)).status()).toBe(200);
});

import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

test('Style it for today: from Today to four steps, then named into a Look', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  for (const label of ['Camel coat', 'Cream knit']) {
    await page.request.post('/api/v1/wardrobe/items', { data: { label } });
  }
  await page.goto('/today/style');
  await expect(page.getByRole('heading', { level: 1, name: 'What’s today?' })).toBeVisible();
  expect(await seriousViolations(page), '/today/style').toEqual([]);
  await page.getByLabel('What’s on (optional)').fill('Studio day, then dinner');
  await page.getByRole('button', { name: 'Style it' }).click();

  await expect(page).toHaveURL(/\/today\/style\/[0-9a-f-]{36}$/);
  for (const step of ['The anchor', 'The canvas', 'The texture', 'The accents']) {
    await expect(page.getByRole('heading', { level: 2, name: step })).toBeVisible({
      timeout: 30_000,
    });
  }
  await expect(page.getByText('Yours').first()).toBeVisible();
  expect(await seriousViolations(page), 'daily look').toEqual([]);

  // Suggested items are pictured on demand (UX-09).
  const show = page.getByRole('button', { name: /^Show / });
  const before = await show.count();
  expect(before).toBeGreaterThan(0);
  await show.first().click();
  await expect(page.getByRole('img', { name: /^Robes’ picture of / })).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(show).toHaveCount(before - 1);

  await page.getByLabel('Name it').fill('Studio to dinner');
  await page.getByRole('button', { name: 'Save this look' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Studio to dinner' })).toBeVisible();
});

test('the daily look page opens by id, and the tray links to it', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  const { jobId } = await (await page.request.post('/api/v1/today/generate', { data: {} })).json();
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/v1/jobs/${jobId}`)).json()).output.dailyLookId,
      {
        timeout: 30_000,
      },
    )
    .toBeTruthy();
  const { output } = await (await page.request.get(`/api/v1/jobs/${jobId}`)).json();
  await page.goto('/');
  await page
    .getByRole('region', { name: 'In the studio' })
    .getByRole('link', { name: /Style it for today/ })
    .click();
  await expect(page).toHaveURL(`/today/looks/${output.dailyLookId}`);
  await expect(page.getByRole('heading', { level: 2, name: 'The anchor' })).toBeVisible();
});

test('home city saves in You › Account', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you/account');
  await page.getByLabel('Home city').fill('Dublin');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  expect((await (await page.request.get('/api/v1/me')).json()).homeCity).toBe('Dublin');
});

import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

test.beforeEach(async ({ context }) => isolateClientIp(context));

// Day planning (legacy ff87e89 + 809b13e): summary rows by week, every day opens the day page,
// and the picker adds one or several saved looks at once.
test('a day opens its page, and the picker adds several saved looks to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signIn(page);
  await declineConsent(page);
  const api = page.request;
  for (const name of ['Office', 'Dinner', 'Errands']) {
    await api.post('/api/v1/looks', { data: { name, pieces: [] } });
  }
  const { date } = await (await api.get('/api/v1/today')).json();

  await page.goto('/plan');
  await expect(page.getByRole('radio', { name: 'List' })).toBeChecked();
  await expect(page.getByText('The next 30 days')).toBeVisible();
  await expect(page.getByRole('region', { name: /^(This week|Rest of this week)$/ })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('link', { name: /^Open Today/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${date}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Name the day' })).toBeVisible();
  await page.getByRole('button', { name: /Choose from your looks/ }).click();

  const picker = page.getByRole('dialog', { name: 'What to wear?' });
  await expect(picker.getByText('Tap looks to add one or several')).toBeVisible();
  await picker.getByRole('button', { name: /Office/ }).click();
  await picker.getByRole('button', { name: /Dinner/ }).click();
  await picker.getByRole('button', { name: 'Add 2 looks' }).click();
  await expect(page.getByText(/^2 looks added to /).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Office/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Dinner/ })).toBeVisible();
  await expect(page.getByText('2 looks', { exact: true })).toBeVisible();

  // A look already on the day is shown, never offered twice.
  await page.getByRole('button', { name: /Add a look/ }).click();
  await expect(picker.getByRole('button', { name: /Office/ })).toBeDisabled();
  await expect(picker.getByText('Already on this day')).toHaveCount(2);
  await picker.getByRole('button', { name: 'Close' }).click();
  await expect(picker).toBeHidden();

  const month = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  await page.getByRole('link', { name: month, exact: true }).click();
  await expect(page.getByRole('link', { name: /^Open Today .*: 2 looks$/ })).toBeVisible();

  // Month: a cell per day, each opening its page; the header names the month.
  await page.getByRole('radio', { name: 'Month' }).click();
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  await page.getByRole('link', { name: /, 2 looks$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${date}$`));
});

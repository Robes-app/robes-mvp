import { expect, type Page, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn, uniqueEmail } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

async function expectThreeWays(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({
    timeout: 30_000,
  });
  const ways = page.getByRole('list', { name: 'Three ways' }).getByRole('listitem');
  await expect(ways).toHaveCount(3);
  // Frames render after the job; they replace their skeletons without a reload.
  await expect(page.getByRole('img', { name: /^A look: / })).toHaveCount(3, { timeout: 30_000 });
}

test('onboarding’s first piece lands on its styled result', async ({ page }) => {
  await signIn(page, uniqueEmail('e2e-onb'), 'Niall', 'white linen shirt');
  await declineConsent(page);
  await expectThreeWays(page, 'white linen shirt');
});

test('style a piece from Looks, then save it', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/looks/style');
  const start = page.getByRole('button', { name: 'Style it' });
  await expect(start).toBeDisabled();
  await page.getByLabel('Or describe it').fill('navy blazer');
  await page.getByLabel('Where to? (optional)').fill('Dinner');
  await start.click();
  await expect(page).toHaveURL(/\/looks\/style\/[0-9a-f-]{36}$/);
  await expectThreeWays(page, 'navy blazer');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();

  // A saved idea stays in Ideas; Saved holds Looks, so one of its ways becomes a Look.
  await page.goto('/looks/ideas');
  await expect(page.getByRole('heading', { name: 'navy blazer' })).toBeVisible();
  await page.getByRole('link', { name: 'navy blazer' }).click();
  const firstWay = page.getByRole('list', { name: 'Three ways' }).getByRole('listitem').first();
  const wayTitle = (await firstWay.getByRole('heading', { level: 2 }).textContent()) ?? '';
  await firstWay.getByRole('button', { name: /^Save this look/ }).click();
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page).toHaveURL(/\/look\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: wayTitle })).toBeVisible();
  await expect(page.getByText('Robes’ suggestion')).toBeVisible();

  await page.goto('/looks');
  await expect(page.getByRole('link', { name: wayTitle })).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { latestCodeFor } from './mailpit';

// OTP requests are rate limited per IP (3/min), so each test looks like its own client.
test.beforeEach(async ({ context }) => {
  const octet = (): number => Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
});

test('passwordless sign-in, onboarding and sign-out', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;

  await page.goto('/wardrobe');
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fwardrobe/);

  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();

  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('First name').fill('Ann');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: /, Ann\.$/ })).toBeVisible();
  const me = await page.request.get('/api/v1/me');
  expect(await me.json()).toMatchObject({ email, firstName: 'Ann', onboarded: true });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  expect((await page.request.get('/api/v1/me')).status()).toBe(401);
});

test('a wrong code is rejected', async ({ page }) => {
  const email = `e2e-${Date.now()}-bad@test.dev`;
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();
  const code = await latestCodeFor(email);
  await page.getByLabel('Code').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'That code didn’t match. Check it and try again.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn, uniqueEmail } from './helpers';
import { latestCodeFor } from './mailpit';

test.beforeEach(({ context }) => isolateClientIp(context));

test('passwordless sign-in, onboarding and sign-out', async ({ page }) => {
  await page.goto('/wardrobe');
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fwardrobe/);

  const email = await signIn(page);

  await declineConsent(page);
  const me = await page.request.get('/api/v1/me');
  expect(await me.json()).toMatchObject({ email, firstName: 'Niall', onboarded: true });

  await page.getByRole('link', { name: 'You', exact: true }).click();
  await page.getByRole('radio', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  expect((await page.request.get('/api/v1/me')).status()).toBe(401);
});

test('the Terms and Privacy notice are public, linked from sign-in', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByRole('link', { name: 'Privacy notice' }).click();
  await expect(page).toHaveURL(/\/legal\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your digital twin' })).toBeVisible();
  await expect(page.getByText('On its way.')).toHaveCount(0);

  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello@byrobes.com' })).toHaveAttribute(
    'href',
    'mailto:hello@byrobes.com',
  );
  expect((await page.goto('/legal/nope'))?.status()).toBe(404);
});

test('a wrong code is rejected', async ({ page }) => {
  const email = uniqueEmail('e2e-bad');
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

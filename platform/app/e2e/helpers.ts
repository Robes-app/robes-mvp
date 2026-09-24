import { type BrowserContext, expect, type Page } from '@playwright/test';
import { latestCodeFor } from './mailpit';

// OTP requests are rate limited per IP (3/min), so each test looks like its own client.
export async function isolateClientIp(context: BrowserContext): Promise<void> {
  const octet = (): number => Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
}

export function uniqueEmail(tag = 'e2e'): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
}

// Signs up a fresh user with an emailed code and completes onboarding; lands on Today.
export async function signIn(
  page: Page,
  email = uniqueEmail(),
  firstName = 'Ann',
): Promise<string> {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email.' })).toBeVisible();

  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('First name').fill(firstName);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`, ${firstName}\\.$`) })).toBeVisible();
  return email;
}

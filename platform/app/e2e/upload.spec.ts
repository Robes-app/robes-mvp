import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { latestCodeFor } from './mailpit';

// Needs MinIO with the dev bucket (pnpm services:up && pnpm media:setup) and APP_ENV=dev.
const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(async ({ context }) => {
  const octet = (): number => Math.floor(Math.random() * 250);
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
});

async function signIn(page: Page): Promise<void> {
  const email = `e2e-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('Code').fill(await latestCodeFor(email));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('First name').fill('Niall');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByRole('heading', { name: /, Niall\.$/ })).toBeVisible();
}

test('a photo uploads straight to storage and comes back as a signed rendition', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  await signIn(page);
  await page.goto('/dev/upload');
  await page.getByLabel('Photo').setInputFiles(PHOTO);

  const image = page.getByRole('img', { name: 'Your uploaded photo' });
  // Rendition runs after the complete call responds (next/server after()), so refresh until ready.
  await expect(async () => {
    const refresh = page.getByRole('button', { name: 'Refresh' });
    if (await refresh.isVisible()) await refresh.click();
    await expect(image).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });

  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
  const src = await image.getAttribute('src');
  expect(src).toContain('X-Amz-Signature=');
  const unsigned = new URL(src ?? '');
  unsigned.search = '';
  expect((await page.request.get(unsigned.toString())).status()).toBe(403);
  expect(violations).toEqual([]);
});

test('the dev upload page needs a session', async ({ page }) => {
  await page.goto('/dev/upload');
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

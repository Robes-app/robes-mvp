import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('photos become pieces she can edit, remove and undo', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe');
  await expect(page.getByRole('heading', { name: 'Your wardrobe starts here.' })).toBeVisible();

  await page.goto('/wardrobe/add');
  await page.getByLabel(/Choose photos/).setInputFiles(PHOTO);
  await expect(page).toHaveURL(/\/wardrobe$/);
  const pieces = page.getByRole('list', { name: 'Pieces' });
  // Read by the offline fake: the piece fills in without a reload.
  await expect(pieces.getByRole('heading', { name: 'Camel wool coat' })).toBeVisible({
    timeout: 30_000,
  });

  await pieces.getByRole('link', { name: /Camel wool coat/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Camel wool coat' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Photo of Camel wool coat' })).toBeVisible();
  await page.getByLabel('Brand').fill('Harbour');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();

  await page.getByRole('link', { name: 'Wardrobe' }).first().click();
  await pieces.getByRole('button', { name: 'Remove Camel wool coat' }).click();
  await expect(pieces).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('list', { name: 'Pieces' }).getByRole('heading', { name: 'Camel wool coat' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Harbour')).toBeVisible();
});

test('a wish becomes a piece when she buys it, and removal can be undone', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/wardrobe/wishlist');
  await expect(page.getByRole('heading', { name: 'Pieces you’re after live here.' })).toBeVisible();
  for (const label of ['Black leather loafers', 'Silk scarf']) {
    await page.getByLabel('A piece you want').fill(label);
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await expect(page.getByRole('list', { name: 'Wishlist' }).getByText(label)).toBeVisible();
  }
  const wishes = page.getByRole('list', { name: 'Wishlist' });

  await wishes.getByRole('button', { name: 'Remove Silk scarf' }).click();
  await expect(wishes.getByText('Silk scarf')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(wishes.getByText('Silk scarf')).toBeVisible();

  await wishes
    .getByRole('listitem')
    .filter({ hasText: 'Black leather loafers' })
    .getByRole('button', { name: 'I bought this' })
    .click();
  await expect(page.getByText('Black leather loafers is in your wardrobe now.')).toBeVisible();
  await expect(wishes.getByText('Black leather loafers')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Pieces' }).click();
  await expect(
    page
      .getByRole('list', { name: 'Pieces' })
      .getByRole('heading', { name: 'Black leather loafers' }),
  ).toBeVisible();
});

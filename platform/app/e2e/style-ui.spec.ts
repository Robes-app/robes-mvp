import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('a headshot becomes her colours; corrections save', async ({ page }) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('link', { name: 'Colours and shape' }).click();
  await expect(page).toHaveURL(/\/you\/style$/);
  expect(await seriousViolations(page)).toEqual([]);

  const colours = page.getByRole('region', { name: 'Your colours' });
  await colours.getByLabel('Choose a photo').setInputFiles(PHOTO);
  // The offline fake reads every face as Soft Autumn.
  await expect(colours.getByRole('heading', { name: 'Soft Autumn' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(colours.getByRole('list', { name: 'Wear' }).getByRole('listitem')).not.toHaveCount(
    0,
  );
  await expect(colours.getByLabel('Use another photo')).toBeAttached();

  await page.getByLabel('Colours you love on you').fill('Navy, Cream');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  const style = await (await page.request.get('/api/v1/me/style')).json();
  expect(style.overrides.lovedColors).toEqual(['Navy', 'Cream']);
});

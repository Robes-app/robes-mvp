import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('a close-up reads her colouring; on Colouring, she picks the season next door and sets her colours', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('link', { name: 'Your digital twin' }).click();
  await expect(page).toHaveURL(/\/you\/model$/);
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('link', { name: /Colouring/ }).click();
  await expect(page).toHaveURL(/\/you\/model\/colouring$/);
  // Before a close-up: the dashed slot and the screen's one commitment; no skin or hair is ringed.
  await expect(page.getByRole('button', { name: 'Porcelain' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const closeUp = page.getByRole('region', { name: 'Your close-up' });
  await closeUp.getByLabel('Choose a photo').setInputFiles(PHOTO);
  // The offline fake reads every face as Soft Autumn.
  const season = page.getByRole('region', { name: 'Your season' });
  await expect(season.getByRole('button', { name: 'Soft Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 30_000 },
  );
  await season.getByRole('button', { name: 'True Autumn', exact: true }).click();
  await expect(season.getByRole('button', { name: 'True Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // The list holds still under her: it stays anchored on what the photograph read.
  await expect(season.getByRole('button').first()).toHaveText('Soft Autumn');
  // The re-take is a circle on the photo; the colour notes open in their own sheet.
  await expect(closeUp.getByLabel('Use another photo')).toBeAttached();
  await season.getByRole('button', { name: 'Full colour notes' }).click();
  await expect(page.getByRole('dialog', { name: 'Full colour notes' })).toBeVisible();
  await page.keyboard.press('Escape');
  const style = await (await page.request.get('/api/v1/me/style')).json();
  expect(style.colour.season).toBe('True Autumn');
  expect(style.colour.read_season).toBe('Soft Autumn');

  // Your colours (Style DNA): Avoid · No view · Love per family, saved at once.
  await page.goto('/you/style');
  await page.getByRole('button', { name: /Your colours/ }).click();
  const coloursSheet = page.getByRole('dialog', { name: 'Your colours' });
  await coloursSheet
    .getByRole('radiogroup', { name: 'Blues' })
    .getByRole('radio', { name: 'Love' })
    .click();
  await expect
    .poll(async () => (await (await page.request.get('/api/v1/me/style')).json()).palette.fam)
    .toEqual({ blues: 1 });
});

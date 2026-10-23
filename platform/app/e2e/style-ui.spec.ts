import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('a close-up reads her colouring; she picks the season next door and sets her colours', async ({
  page,
}) => {
  await signIn(page);
  await declineConsent(page);
  await page.goto('/you');
  await page.getByRole('link', { name: 'Your digital twin' }).click();
  await expect(page).toHaveURL(/\/you\/model$/);
  expect(await seriousViolations(page)).toEqual([]);

  const colours = page.getByRole('region', { name: 'Your colours' });
  await colours.getByLabel('Choose a photo').setInputFiles(PHOTO);
  // The offline fake reads every face as Soft Autumn.
  const read = page.getByRole('region', { name: 'Read from your photographs' });
  await expect(read.getByRole('button', { name: /Colouring.*Soft Autumn/ })).toBeVisible({
    timeout: 30_000,
  });

  await read.getByRole('button', { name: /Colouring/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Your photographs' });
  await expect(sheet.getByRole('button', { name: 'Soft Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await sheet.getByRole('button', { name: 'True Autumn', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'True Autumn', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const style = await (await page.request.get('/api/v1/me/style')).json();
  expect(style.colour.season).toBe('True Autumn');

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

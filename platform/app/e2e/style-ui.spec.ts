import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { declineConsent, isolateClientIp, seriousViolations, signIn } from './helpers';

const PHOTO = fileURLToPath(new URL('./fixtures/photo.jpg', import.meta.url));

test.beforeEach(({ context }) => isolateClientIp(context));

test('a close-up reads her colouring; she picks the season next door and corrects colours', async ({
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

  await sheet.getByLabel('Colours you love on you').fill('Navy, Cream');
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  const saved = await (await page.request.get('/api/v1/me/style')).json();
  expect(saved.overrides.lovedColors).toEqual(['Navy', 'Cream']);
});
